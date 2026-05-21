chrome.alarms.create("badge-tick", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "badge-tick") return;
  const { session } = await chrome.storage.local.get("session");
  if (!session) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }
  const elapsed = Date.now() - new Date(session.start_time).getTime();
  const mins  = Math.floor(elapsed / 60_000);
  const label = mins >= 60 ? `${Math.floor(mins / 60)}h` : `${mins}m`;
  chrome.action.setBadgeText({ text: label });
  chrome.action.setBadgeBackgroundColor({ color: "#80ED99" });
});

chrome.storage.onChanged.addListener((changes) => {
  if (!changes.session) return;
  if (!changes.session.newValue) {
    chrome.action.setBadgeText({ text: "" });
  } else {
    chrome.action.setBadgeBackgroundColor({ color: "#80ED99" });
    chrome.action.setBadgeText({ text: "●" });
  }
});
