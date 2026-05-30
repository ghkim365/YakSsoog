---
name: Warm & Reliable Care
colors:
  surface: '#fbf9f4'
  surface-dim: '#dbdad5'
  surface-bright: '#fbf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#f0eee9'
  surface-container-high: '#eae8e3'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#544338'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ec'
  outline: '#877366'
  outline-variant: '#dac2b2'
  surface-tint: '#934b00'
  primary: '#934b00'
  on-primary: '#ffffff'
  primary-container: '#f39241'
  on-primary-container: '#633100'
  inverse-primary: '#ffb781'
  secondary: '#356289'
  on-secondary: '#ffffff'
  secondary-container: '#a5d0fe'
  on-secondary-container: '#2c5981'
  tertiary: '#006c4e'
  on-tertiary: '#ffffff'
  tertiary-container: '#64ba97'
  on-tertiary-container: '#004833'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcc5'
  primary-fixed-dim: '#ffb781'
  on-primary-fixed: '#301400'
  on-primary-fixed-variant: '#703800'
  secondary-fixed: '#cfe5ff'
  secondary-fixed-dim: '#a0cbf8'
  on-secondary-fixed: '#001d33'
  on-secondary-fixed-variant: '#194a70'
  tertiary-fixed: '#9df4ce'
  tertiary-fixed-dim: '#81d7b2'
  on-tertiary-fixed: '#002115'
  on-tertiary-fixed-variant: '#00513a'
  background: '#fbf9f4'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-xl:
    fontFamily: Noto Sans
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Noto Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-target-min: 56px
  gutter: 1.25rem
  margin-mobile: 1.5rem
  stack-gap: 1rem
  section-gap: 2.5rem
---

## Brand & Style

This design system is built on the foundation of **Warm Accessibility**. It bridges the generational gap between seniors needing clear medication management and caregivers (or children) ensuring safety. The personality is "Trustworthy Companion"—gentle yet disciplined.

The visual style is a blend of **Corporate Modern** for reliability and **Tactile Minimalism** for ease of use. It avoids complex gradients or abstract metaphors, favoring large, recognizable shapes and a soft color palette that reduces eye strain. High contrast is prioritized for legibility, while rounded corners and soft backgrounds evoke a sense of comfort and care.

## Colors

The palette is derived from the core logo colors, optimized for high visibility and emotional warmth.

*   **Primary Orange (#F39241):** Used for "Action" items—taking medication, adding a new schedule, and primary buttons. It is energetic and friendly.
*   **Secondary Blue (#3B678F):** Used for "Information" and "Navigation." It provides a professional, calming anchor to the warmer tones.
*   **Success Green (#50A684):** A secondary functional color used to indicate completed doses.
*   **Neutral Cream (#F9F7F2):** The primary background color. It is softer on the eyes than pure white, providing a "paper-like" warmth that improves reading endurance for seniors.
*   **Text & Strokes:** Use a deep slate gray (#2D3436) instead of pure black to maintain high contrast while appearing more approachable.

## Typography

Legibility is the highest priority. We use **Plus Jakarta Sans** for headlines to provide a modern, friendly character, and **Noto Sans** for body copy to ensure maximum clarity in Korean and English characters.

*   **Size Tiers:** The system provides three distinct scales (Normal, Large, Extra Large). The Extra Large tokens are the default for senior users.
*   **Weight:** Avoid "Thin" or "Light" weights. Medium (500) is the minimum for body text to ensure strokes are visible against the cream background.
*   **Spacing:** Increased line height (1.5x) prevents lines of text from blurring together for users with visual impairments.

## Layout & Spacing

This design system uses a **Fluid Content Model** optimized for thumb-driven navigation.

*   **Touch Targets:** Every interactive element has a minimum height/width of 56px to accommodate reduced motor precision.
*   **The 8px Grid:** All spacing is a multiple of 8px, but vertical gaps between cards are generous (16px - 24px) to clearly separate different medication tasks.
*   **Safe Areas:** Large 24px side margins on mobile ensure content doesn't feel cramped and keeps interactive elements away from the curved edges of modern screens.
*   **Mobile-First:** The layout is a single-column stack. On tablets, cards may transition to a 2-column grid, but the "One Task per View" philosophy remains.

## Elevation & Depth

To maintain a "tactile" feel that is intuitive for all ages, we use **Tonal Layers** combined with **Soft Physicality**.

1.  **Base Layer:** Neutral Cream (#F9F7F2).
2.  **Surface Layer (Cards):** Pure White (#FFFFFF) with a thin, 1px soft border (#E0DCD0). 
3.  **Elevation:** We avoid heavy shadows. Instead, we use a single, very subtle ambient glow (8px blur, 5% opacity) to lift "Active" cards (e.g., the medication to be taken *now*) above the background.
4.  **Interaction:** When a button is pressed, it shouldn't just change color—it should visually "depress" (slight scale down to 0.98), providing immediate physical feedback.

## Shapes

Shapes are "Friendly and Soft." The standard corner radius is **16px (rounded-lg)** for medication cards and primary buttons. 

This level of roundedness creates a "pill-like" aesthetic that reinforces the app's purpose while removing any "sharp" or "intimidating" technical edges. Larger containers like bottom sheets use **24px (rounded-xl)** to feel more like physical trays.

## Components

### Buttons
*   **Primary:** Large (#F39241), white bold text, 56px height. Used for "Take Medicine."
*   **Secondary:** White background with a Blue (#3B678F) border. Used for "Edit" or "Skip."

### Medication Cards
*   Cards must contain a large icon of the pill shape/color. 
*   The time of dose (e.g., "8:00 AM") should be at least 24px (Headline-MD).
*   Status indicators (Taken/Missed) use large, high-contrast checkmarks or warning icons.

### Inputs
*   Input fields are "Boxy" with a light gray fill.
*   Labels always sit above the field, never as placeholder text alone, ensuring the user knows what they are typing at all times.

### Chips
*   Used for tags like "Before Meal" or "With Water." 
*   Chips use the Secondary Blue at 10% opacity with 100% opacity text to ensure high contrast without overwhelming the visual hierarchy.

### Large Iconography
*   Icons use a consistent "Thick Line" (2.5pt stroke) style with rounded caps. They should be accompanied by text labels whenever possible to eliminate ambiguity.