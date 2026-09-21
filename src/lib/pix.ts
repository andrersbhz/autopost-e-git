// Gera payload Pix "copia e cola" (BR Code EMV) com valor dinâmico.
// Referência: Manual BR Code do Banco Central.

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitize(text: string, max: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .slice(0, max)
    .toUpperCase();
}

export function buildPixPayload(opts: {
  key: string;
  amount: number;
  merchantName: string;
  merchantCity?: string;
  txid?: string;
  description?: string;
}): string {
  const { key, amount } = opts;
  const merchantName = sanitize(opts.merchantName || "RECEBEDOR", 25);
  const merchantCity = sanitize(opts.merchantCity || "SAO PAULO", 15);
  const txid = (opts.txid || "***").replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "***";

  const merchantAccountInfo =
    tlv("00", "br.gov.bcb.pix") +
    tlv("01", key) +
    (opts.description ? tlv("02", sanitize(opts.description, 40)) : "");

  const payloadNoCRC =
    tlv("00", "01") +
    tlv("26", merchantAccountInfo) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (amount > 0 ? tlv("54", amount.toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", merchantName) +
    tlv("60", merchantCity) +
    tlv("62", tlv("05", txid)) +
    "6304";

  return payloadNoCRC + crc16(payloadNoCRC);
}
