import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Plus, Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import {
  useCreditorResponses,
  useCreateCreditorResponse,
  useDeleteCreditorResponse,
  type CreditorResponseChannel,
  type CreditorResponseDirection,
  type CreditorResponseSentiment,
} from '@/hooks/useCreditorResponses';

interface Props {
  creditorId?: string | null;
  liabilityId?: string | null;
  serviceId?: string | null;
  /** Required when no creditorId is set (e.g. from LiabilityDetailSheet). */
  defaultCreditorId?: string | null;
}

const sentimentBadge: Record<CreditorResponseSentiment, string> = {
  positive: 'bg-green-100 text-green-800',
  neutral: 'bg-gray-100 text-gray-700',
  negative: 'bg-red-100 text-red-800',
};

export function CreditorResponsesPanel({ creditorId, liabilityId, serviceId, defaultCreditorId }: Props) {
  const { data: responses, isLoading } = useCreditorResponses({ creditorId, liabilityId, serviceId });
  const createMut = useCreateCreditorResponse();
  const deleteMut = useDeleteCreditorResponse();

  const [showForm, setShowForm] = useState(false);
  const [direction, setDirection] = useState<CreditorResponseDirection>('inbound');
  const [channel, setChannel] = useState<CreditorResponseChannel>('email');
  const [sentiment, setSentiment] = useState<CreditorResponseSentiment | ''>('');
  const [subject, setSubject] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');

  const effectiveCreditorId = creditorId || defaultCreditorId || null;

  const resetForm = () => {
    setDirection('inbound');
    setChannel('email');
    setSentiment('');
    setSubject('');
    setSummary('');
    setBody('');
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!effectiveCreditorId) return;
    await createMut.mutateAsync({
      creditor_id: effectiveCreditorId,
      liability_id: liabilityId ?? null,
      client_service_id: serviceId ?? null,
      direction,
      channel,
      sentiment: sentiment || null,
      subject: subject || null,
      summary: summary || null,
      body: body || null,
    });
    resetForm();
  };

  // Aggregate metrics
  const inbound = responses?.filter((r) => r.direction === 'inbound') || [];
  const avgResponseTime =
    inbound.filter((r) => r.response_time_hours != null).reduce((s, r) => s + (r.response_time_hours || 0), 0) /
    Math.max(1, inbound.filter((r) => r.response_time_hours != null).length);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Creditor Communications
            {responses && responses.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {responses.length}
              </Badge>
            )}
          </CardTitle>
          {effectiveCreditorId && (
            <Button size="sm" variant="outline" onClick={() => setShowForm((s) => !s)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Log
            </Button>
          )}
        </div>
        {inbound.length > 0 && avgResponseTime > 0 && (
          <p className="text-xs text-muted-foreground">
            Avg inbound response: {avgResponseTime.toFixed(1)} h ({inbound.length} replies)
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="space-y-2 rounded-md border p-3 bg-muted/30">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Direction</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as CreditorResponseDirection)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Channel</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as CreditorResponseChannel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="letter">Letter</SelectItem>
                    <SelectItem value="fax">Fax</SelectItem>
                    <SelectItem value="portal">Portal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Sentiment</Label>
                <Select value={sentiment || '__none__'} onValueChange={(v) => setSentiment(v === '__none__' ? '' : (v as CreditorResponseSentiment))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Re: Account #1234" />
            </div>
            <div>
              <Label className="text-xs">Summary</Label>
              <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One-line summary" />
            </div>
            <div>
              <Label className="text-xs">Notes / Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createMut.isPending}>
                {createMut.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (!responses || responses.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">No communications logged yet.</p>
        )}

        <div className="space-y-2">
          {responses?.map((r) => (
            <div key={r.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {r.direction === 'inbound' ? (
                    <ArrowDownLeft className="h-3.5 w-3.5 text-blue-600" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Badge variant="outline" className="text-xs capitalize">{r.channel}</Badge>
                  {r.sentiment && (
                    <Badge className={`text-xs capitalize ${sentimentBadge[r.sentiment]}`}>{r.sentiment}</Badge>
                  )}
                  {r.response_time_hours != null && (
                    <span className="text-xs text-muted-foreground">
                      {r.response_time_hours.toFixed(1)} h to reply
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(r.received_at), 'MMM d, yyyy h:mm a')}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => deleteMut.mutate(r.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {r.subject && <p className="font-medium mt-1">{r.subject}</p>}
              {r.summary && <p className="text-muted-foreground mt-0.5">{r.summary}</p>}
              {r.body && <p className="whitespace-pre-wrap mt-1 text-muted-foreground">{r.body}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
