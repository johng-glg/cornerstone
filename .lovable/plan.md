
# Enable Full Page Width for Settings Page

## Overview
The Settings page currently constrains all content to `max-w-5xl` (1024px), which limits the width of tabs like Templates, Workflows, eSign, and Legal Teams that would benefit from more horizontal space. This plan removes the artificial width constraint so all settings tabs can expand to fill the available page width.

## Current State
In `src/pages/Settings.tsx` (line 23):
```typescript
<Tabs defaultValue="profile" className="max-w-5xl">
```

This constrains all tab content to a maximum of 1024px regardless of screen size.

## Problem
- Tabs with tables, grids, or complex layouts (Templates, Workflows, Legal Teams) are cramped
- Inconsistent with other pages like Clients, Reports, and Payments which use full width
- Wastes available screen real estate on larger monitors

## Solution
Remove the `max-w-5xl` class from the Tabs component, allowing content to expand naturally.

## Changes Required

### File: `src/pages/Settings.tsx`

**Change (line 23)**
```typescript
// Before
<Tabs defaultValue="profile" className="max-w-5xl">

// After
<Tabs defaultValue="profile">
```

## Result
- All Settings tabs will expand to use the full available width
- Individual tab components can still set their own width constraints if needed (e.g., ProfileSettingsTab uses a Card which naturally constrains form width)
- Data-heavy tabs like Templates, Workflows, and Legal Teams will have more room for their tables and grids
