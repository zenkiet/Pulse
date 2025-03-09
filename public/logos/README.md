# Pulse Logo Assets

This directory contains various PNG versions of the Pulse logo for use in different contexts.

## Square Logos (Icon Only)

These are square logos containing only the Pulse icon (no text):

- `pulse-logo-16x16.png` - Favicon size
- `pulse-logo-32x32.png` - Small icon size
- `pulse-logo-64x64.png` - Medium icon size
- `pulse-logo-128x128.png` - Large icon size
- `pulse-logo-256x256.png` - Extra large icon size
- `pulse-logo-512x512.png` - App icon size
- `pulse-logo-1024x1024.png` - High-resolution icon size

## Rectangular Logos (Icon with Text)

These are rectangular logos containing both the Pulse icon and text:

- `pulse-logo-with-text-200x60.png` - Small banner size
- `pulse-logo-with-text-400x120.png` - Medium banner size
- `pulse-logo-with-text-800x240.png` - Large banner size

## Usage Guidelines

- For favicons and small UI elements, use the smaller square logos (16x16, 32x32)
- For app icons and larger UI elements, use the medium to large square logos (64x64, 128x128, 256x256)
- For headers, banners, and marketing materials, use the rectangular logos with text
- For high-resolution displays or when you need to scale the logo, use the largest sizes (512x512, 1024x1024)

## Generating New Sizes

If you need additional sizes or variations, you can run the logo generation scripts:

```bash
# Install the required dependencies
npm install canvas

# Generate square logos (icon only)
node scripts/generate-logo-pngs.js

# Generate rectangular logos (icon with text)
node scripts/generate-logo-with-text.js
```

## Logo Design

The Pulse logo features:
- A circular background with a blue gradient (#3a7bd5)
- A pulsing animation ring (represented as a static ring in the PNG versions)
- A central white dot representing the core of the pulse 