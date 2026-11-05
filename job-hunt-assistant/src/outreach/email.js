// Cold email via your own inbox: opens a pre-filled compose window and you
// press Send. No passwords stored, and it's your real account, so replies land
// where you'll see them.
export function composeUrl(provider, to, subject, body) {
  const q = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v ?? "")}`).join("&");
  if (provider === "gmail") return `https://mail.google.com/mail/?view=cm&fs=1&${q({ to, su: subject, body })}`;
  return `https://outlook.office.com/mail/deeplink/compose?${q({ to, subject, body })}`;
}
