# Design Specifications - App Remédio

## 1. Visual Identity & Mood
The app should convey **trust, cleanliness, health, and accessibility**. Since the target audience may include elderly people or people in fragile health states, the design must prioritize readability and clarity over complexity.

- **Mood**: Medical, Clean, Supportive, Intuitive.
- **Key Principles**: High contrast, large touch targets, clear typography, and intuitive navigation.

---

## 2. Color Palette (Proposed)
| Role | Color Code | Psychology |
| :--- | :--- | :--- |
| **Primary** | `#007AFF` (Medical Blue) | Trust, professionalism, health. |
| **Secondary** | `#34C759` (Health Green) | Recovery, nature, safety. |
| **Accent/Warning** | `#FF3B30` (Alert Red) | Urgency, critical medication. |
| **Background** | `#F2F2F7` (Light Gray) | Cleanliness, reduces eye strain. |
| **Surface/Card** | `#FFFFFF` (Pure White) | Organization and separation. |
| **Text (Primary)** | `#1C1C1E` (Near Black) | Maximum readability. |
| **Text (Secondary)** | `#8E8E93` (Medium Gray) | De-emphasized info. |

---

## 3. Typography
- **Primary Font**: *Inter* or *Roboto* (Sans-serif, highly legible).
- **Hierarchy**:
    - **Headers**: Bold, large size (24px+), Primary Text color.
    - **Body**: Regular weight, medium size (16px), Primary Text color.
    - **Captions**: Regular/Light weight, small size (12px-14px), Secondary Text color.

---

## 4. Screens Map (Phase 1 - MVP)

### S1: Onboarding / Login
- **Goal**: Simple entry to the app.
- **Elements**: App Logo, "Welcome" text, Login/Sign-up fields, "Forgot Password" link.

### S2: Dashboard (Medication Timeline)
- **Goal**: Quick view of today's medicines.
- **Elements**: 
    - Header with current date.
    - **Medication Cards**: 
        - Small photo of the medicine.
        - Name and dosage.
        - Time of intake.
        - Status checkbox (Taken / Pending).
    - Floating Action Button (FAB) `(+)` to add new medicine.

### S3: Medicine Registration (Add/Edit)
- **Goal**: Easy data entry for new medications.
- **Elements**: 
    - Image Upload Area (Placeholder for photo).
    - Input: Medicine Name.
    - Input: Dosage (e.g., "1 pill", "10mg").
    - Input: Frequency (e.g., "Every 8 hours").
    - Time Picker: Specific start time.
    - "Save" button (Primary color).

### S4: Medication Detail
- **Goal**: Detailed view of a specific medicine.
- **Elements**: Full-size photo, detailed dosage info, history of intakes, "Edit" and "Delete" buttons.

### S5: Alert Screen (Notification Pop-up)
- **Goal**: Immediate identification of the medicine.
- **Elements**: 
    - Large, clear photo of the medicine.
    - Big text: "Time to take [Medicine Name]!".
    - Button: "Mark as Taken".
    - Button: "Snooze 10 min".

---

## 5. UX Components & Patterns
- **Buttons**: Rounded corners (12px), ample padding.
- **Cards**: Subtle shadows, white background, rounded corners (16px).
- **Inputs**: Clearly labeled, with focus states in Primary Blue.
- **Icons**: Outline style (Phosphor Icons or Lucide), consistent stroke width.

---

## 6. Accessibility Requirements
- **Contrast**: Minimum 4.5:1 for text.
- **Touch Targets**: Minimum 44x44px for all interactive elements.
- **Visual Cues**: Don't rely on color alone (e.g., use an icon AND red color for alerts).
