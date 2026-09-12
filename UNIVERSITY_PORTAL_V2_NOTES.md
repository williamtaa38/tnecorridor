# University Officer Portal V2 — Changes

## Courses & Fees
- Structured course builder: Year -> Semester -> Subject/Module.
- Four fee modes: whole programme, yearly, per semester, or per subject.
- Automatic tuition subtotal, GST/SST/tax amount, and total payable.
- Subject fields include name, code, credits, and optional subject fee.
- Existing preview courses are migrated automatically from the old data shape.

## Scholarships
- Percentage or fixed-amount awards.
- Scope can be the total course fee, selected academic years, or selected semesters.
- Year/semester scopes use the structured course fee data to calculate the eligible scholarship base.
- Offer Builder applies the discount only to the selected scope.

## Pathway Packages
- Package stages select real courses from Courses & Fees instead of free text.
- Entry qualification + target award create the required progression structure.
- Example: SPM -> Pre-U/Foundation -> Degree -> Master/Postgraduate.
- Progression validation prevents stage skipping or incorrect academic order.
- Package totals are calculated from the selected courses.
- Mixed-currency packages are prevented because they cannot be safely totalled without FX conversion.

## Offer Builder
- Supports either a direct course or a complete pathway package.
- Automatically totals package tuition.
- Filters scholarships to those compatible with the selected route.
- Shows the exact scholarship-eligible base before calculating the discount.
- Calculates tuition -> scholarship discount -> GST/SST -> payable total.

## Supabase preparation
- Added `sql/university-catalogue-schema.sql` containing relational tables and RLS blueprint for courses, years, semesters, subjects, scholarships, scholarship targets, packages and package stages.
- The existing University Officer workspace is still a front-end preview using the project's localStorage data layer. The new SQL file is the backend migration blueprint; it is not automatically executed against the live Supabase project.

## Main files changed
- `pages/university-portal.html`
- `js/university-portal.js`
- `js/admissions-demo-store.js`
- `css/admissions-system.css`
- `sql/university-catalogue-schema.sql` (new)
