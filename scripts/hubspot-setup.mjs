// Creates the "Oblique Play" contact properties in HubSpot. Safe to run more
// than once: properties that already exist are left alone.
//
// Run with: HUBSPOT_ACCESS_TOKEN=... npm run hubspot:setup
// The private app needs the crm.schemas.contacts.write scope for this step.

const token = process.env.HUBSPOT_ACCESS_TOKEN;
if (!token) {
  console.error("Set HUBSPOT_ACCESS_TOKEN first.");
  process.exit(1);
}

const GROUP = "oblique_play";
const api = (path, body) =>
  fetch(`https://api.hubapi.com${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const text = (name, label) => ({ name, label, type: "string", fieldType: "text" });
const number = (name, label) => ({ name, label, type: "number", fieldType: "number" });
const date = (name, label) => ({ name, label, type: "date", fieldType: "date" });
const yesNo = (name, label) => ({
  name,
  label,
  type: "bool",
  fieldType: "booleancheckbox",
  options: [
    { label: "Yes", value: "true", displayOrder: 0 },
    { label: "No", value: "false", displayOrder: 1 },
  ],
});

const properties = [
  yesNo("oblique_play_player", "Oblique Play: player"),
  text("oblique_play_display_name", "Oblique Play: display name"),
  {
    name: "oblique_play_role",
    label: "Oblique Play: role",
    type: "enumeration",
    fieldType: "select",
    options: [
      { label: "Business owner", value: "business_owner", displayOrder: 0 },
      { label: "Finance professional", value: "finance_professional", displayOrder: 1 },
      { label: "Student", value: "student", displayOrder: 2 },
    ],
  },
  yesNo("oblique_play_diagnostic_flag", "Oblique Play: flag for free diagnostic"),
  text("oblique_play_source", "Oblique Play: source"),
  text("oblique_play_referred_by", "Oblique Play: referred by"),
  text("oblique_play_modules", "Oblique Play: modules played"),
  text("oblique_play_quiz_tracks", "Oblique Play: quiz tracks played"),
  number("oblique_play_shifts_completed", "Oblique Play: shifts completed"),
  text("oblique_play_best_scores", "Oblique Play: best scores"),
  number("oblique_play_current_streak", "Oblique Play: current streak"),
  yesNo("oblique_play_marketing_consent", "Oblique Play: marketing consent"),
  date("oblique_play_marketing_consent_date", "Oblique Play: marketing consent date"),
  date("oblique_play_signup_date", "Oblique Play: sign-up date"),
  date("oblique_play_diagnostic_requested", "Oblique Play: asked for a free diagnostic"),
];

const group = await api("/crm/v3/properties/contacts/groups", { name: GROUP, label: "Oblique Play" });
console.log(group.ok ? "Created group Oblique Play" : group.status === 409 ? "Group exists" : `Group failed: ${group.status} ${await group.text()}`);

let failed = 0;
for (const property of properties) {
  const res = await api("/crm/v3/properties/contacts", { ...property, groupName: GROUP });
  if (res.ok) console.log(`Created ${property.name}`);
  else if (res.status === 409) console.log(`Exists  ${property.name}`);
  else {
    failed++;
    console.log(`Failed  ${property.name}: ${res.status} ${await res.text()}`);
  }
}
process.exit(failed ? 1 : 0);
