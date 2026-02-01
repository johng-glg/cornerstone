import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function AppearanceSettingsTab() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize how the application looks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Label>Theme</Label>
          <RadioGroup
            value={theme}
            onValueChange={setTheme}
            className="grid grid-cols-3 gap-4"
          >
            <Label
              htmlFor="theme-light"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
            >
              <RadioGroupItem value="light" id="theme-light" className="sr-only" />
              <Sun className="h-6 w-6 mb-3" />
              <span className="text-sm font-medium">Light</span>
            </Label>

            <Label
              htmlFor="theme-dark"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
            >
              <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
              <Moon className="h-6 w-6 mb-3" />
              <span className="text-sm font-medium">Dark</span>
            </Label>

            <Label
              htmlFor="theme-system"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
            >
              <RadioGroupItem value="system" id="theme-system" className="sr-only" />
              <Monitor className="h-6 w-6 mb-3" />
              <span className="text-sm font-medium">System</span>
            </Label>
          </RadioGroup>
          <p className="text-sm text-muted-foreground">
            Choose between light, dark, or system preference for the color theme.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
