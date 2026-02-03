import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor, Clover, Flag, Ghost } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

const standardThemes = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const funThemes = [
  { value: 'stpatricks', label: "St. Patrick's", icon: Clover, emoji: '🍀' },
  { value: 'july4th', label: '4th of July', icon: Flag, emoji: '🇺🇸' },
  { value: 'halloween', label: 'Halloween', icon: Ghost, emoji: '🎃' },
];

export function AppearanceSettingsTab() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize how the application looks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Theme</Label>
          <RadioGroup
            value={theme}
            onValueChange={setTheme}
            className="grid grid-cols-3 gap-4"
          >
            {standardThemes.map(({ value, label, icon: Icon }) => (
              <Label
                key={value}
                htmlFor={`theme-${value}`}
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem value={value} id={`theme-${value}`} className="sr-only" />
                <Icon className="h-6 w-6 mb-3" />
                <span className="text-sm font-medium">{label}</span>
              </Label>
            ))}
          </RadioGroup>
          <p className="text-sm text-muted-foreground">
            Choose between light, dark, or system preference for the color theme.
          </p>
        </div>

        <Separator />

        <div className="space-y-4">
          <Label>Fun Themes</Label>
          <RadioGroup
            value={theme}
            onValueChange={setTheme}
            className="grid grid-cols-3 gap-4"
          >
            {funThemes.map(({ value, label, icon: Icon, emoji }) => (
              <Label
                key={value}
                htmlFor={`theme-${value}`}
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem value={value} id={`theme-${value}`} className="sr-only" />
                <span className="text-2xl mb-2">{emoji}</span>
                <span className="text-sm font-medium">{label}</span>
              </Label>
            ))}
          </RadioGroup>
          <p className="text-sm text-muted-foreground">
            Celebrate the holidays with festive color schemes!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
