const { parsePhoneNumberFromString } = require("libphonenumber-js");

// Normalizes a Places API phone string to E.164 (e.g. +256700000000).
// defaultCountry is used when the number is written in national format
// without a country code, e.g. "0700 000000".
function toE164(rawPhone, defaultCountry = "UG") {
  if (!rawPhone) return null;
  const parsed = parsePhoneNumberFromString(rawPhone, defaultCountry);
  return parsed && parsed.isValid() ? parsed.number : null;
}

module.exports = { toE164 };
