Please update the Activity Editor to improve the tagging interface using shadcn components only. The tag input interface should allow users to both select existing tags and create new ones freely.

1. Replace the existing tag input field with a searchable multi-select component (e.g. shadcn combobox or tag input variant):
   - Users can type to search tags from the system
   - Users can also type a new tag and press Enter to add it if it does not exist
   - Allow multiple tag selection (chips/pills)

2. Below the input field, implement **four tag suggestion sections** as follows. Each section should display clickable tag chips that populate the tag input when clicked:

   🔥 **Popular Tags Across the System**
   - Show top 10 most frequently used tags
   - Static, system-wide list
   - Tags styled in light grey

   📌 **Tags Used on Similar Activities**
   - Based on shared sector, location, or funding agency
   - Tags styled in blue
   - Include a small badge (e.g. “used in 3 activities”) if available

   👥 **Tags Used by Other Contributors on This Activity**
   - Tags previously applied to this activity by other users
   - Tags styled in purple
   - Only shown if this activity already exists in the system

   ✍️ **User-Created Tags**
   - Any new tags added by this user that do not already exist in the system
   - Tags styled in green with a small “+ New” badge

3. Use hover tooltips to explain each section if needed. Example:
   - “These are the most frequently used tags across all activities.”

4. Visually separate the sections using subheadings and horizontal spacing. Ensure the layout remains responsive and clear on all screen sizes.

5. Help Text (above input field):
   - _“Select existing tags or create your own. Tags help group and discover activities by theme.”_

6. When publishing or saving the activity, persist all tag sources properly:
   - Existing tags are referenced
   - New tags are created and stored
   - All tags linked to the activity with correct metadata