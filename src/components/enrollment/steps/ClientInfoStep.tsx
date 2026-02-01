import { useEffect } from 'react';
import { useEnrollmentWizard } from '../EnrollmentWizardContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
];

export function ClientInfoStep() {
  const { data, updateData, setCanProceed } = useEnrollmentWizard();

  // Validate required fields
  useEffect(() => {
    const isValid = 
      data.first_name.trim().length > 0 &&
      data.last_name.trim().length > 0;
    setCanProceed(isValid);
  }, [data.first_name, data.last_name, setCanProceed]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Client Information</h3>
        <p className="text-sm text-muted-foreground">
          Capture the client's legal identity and contact information.
        </p>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            value={data.first_name}
            onChange={(e) => updateData({ first_name: e.target.value })}
            placeholder="First name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="middle_name">Middle Name</Label>
          <Input
            id="middle_name"
            value={data.middle_name || ''}
            onChange={(e) => updateData({ middle_name: e.target.value })}
            placeholder="Middle name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            value={data.last_name}
            onChange={(e) => updateData({ last_name: e.target.value })}
            placeholder="Last name"
          />
        </div>
      </div>

      {/* DOB and SSN */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of Birth</Label>
          <Input
            id="date_of_birth"
            type="date"
            value={data.date_of_birth || ''}
            onChange={(e) => updateData({ date_of_birth: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ssn_last4">SSN (Last 4 Digits)</Label>
          <Input
            id="ssn_last4"
            value={data.ssn_last4 || ''}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 4);
              updateData({ ssn_last4: value });
            }}
            placeholder="####"
            maxLength={4}
          />
          <p className="text-xs text-muted-foreground">
            Required for credit authorization
          </p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={data.email || ''}
            onChange={(e) => updateData({ email: e.target.value })}
            placeholder="email@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <div className="flex gap-2">
            <Input
              id="phone"
              value={data.phone || ''}
              onChange={(e) => updateData({ phone: e.target.value })}
              placeholder="(555) 555-5555"
              className="flex-1"
            />
            <Select
              value={data.phone_type || 'mobile'}
              onValueChange={(value) => updateData({ phone_type: value as any })}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="home">Home</SelectItem>
                <SelectItem value="work">Work</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <Label className="text-base">Primary Address</Label>
        <div className="space-y-4 pl-1">
          <div className="space-y-2">
            <Label htmlFor="address_line1">Street Address</Label>
            <Input
              id="address_line1"
              value={data.address_line1 || ''}
              onChange={(e) => updateData({ address_line1: e.target.value })}
              placeholder="123 Main St"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address_line2">Apt/Suite/Unit</Label>
            <Input
              id="address_line2"
              value={data.address_line2 || ''}
              onChange={(e) => updateData({ address_line2: e.target.value })}
              placeholder="Apt 4B"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={data.city || ''}
                onChange={(e) => updateData({ city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_state">State</Label>
              <Select
                value={data.address_state || ''}
                onValueChange={(value) => updateData({ address_state: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip_code">ZIP Code</Label>
              <Input
                id="zip_code"
                value={data.zip_code || ''}
                onChange={(e) => updateData({ zip_code: e.target.value })}
                placeholder="12345"
                maxLength={10}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TCPA Consent */}
      <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
        <Checkbox
          id="tcpa_consent"
          checked={data.tcpa_consent}
          onCheckedChange={(checked) => 
            updateData({ tcpa_consent: checked === true })
          }
        />
        <div className="space-y-1">
          <label 
            htmlFor="tcpa_consent" 
            className="text-sm font-medium cursor-pointer"
          >
            TCPA Consent
          </label>
          <p className="text-xs text-muted-foreground">
            Client has given express written consent to receive calls and text messages 
            at the phone number(s) provided, including via automated dialing systems.
          </p>
        </div>
      </div>
    </div>
  );
}
