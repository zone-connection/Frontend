export function downloadTotpBackupCodes(codes: string[]) {
  const body = [
    "Zone Connection — códigos de reserva do autenticador",
    "",
    "Use um destes códigos no login se perder o celular.",
    "Cada código vale uma vez. Guarde em um lugar seguro.",
    "",
    ...codes,
    "",
  ].join("\n");
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "zone-connection-codigos-2fa.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
