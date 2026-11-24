import { describe, expect, it } from 'vitest';
import {
  caretAfterDigits,
  countriesForCode,
  countryFlag,
  countryName,
  digitsOf,
  matchesCountry,
  readInput,
  readNational,
  readValue,
  tooLong,
  tooLongValue,
} from '../../packages/react-native/src/components/PhoneInput/phone';

// The phone number logic of PhoneInput: what the field holds and gives for what people type, paste or autofill.
describe('PhoneInput logic', () => {
  it('drops a national trunk prefix from the value and keeps it in the field', () => {
    const details = readInput('07400123456', 'GB', false);
    expect(details).toMatchObject({ value: '+447400123456', text: '07400123456', possible: true, valid: true });
    expect(readInput('89123456789', 'RU', false).value).toBe('+79123456789');
  });

  it('groups the digits as the region writes them when formatting', () => {
    expect(readInput('07400123456', 'GB', true).text).toBe('07400 123456');
    expect(readInput('2015550123', 'US', true).text).toBe('(201) 555-0123');
  });

  it('gives the digits so far after the code while a number is typed', () => {
    expect(readInput('0770', 'GB', false)).toMatchObject({ value: '+44770', possible: false, valid: false });
    expect(readInput('', 'GB', false).value).toBe('');
  });

  it('reads a pasted or autofilled international number into its region', () => {
    // The field holds the number as the region dials it, so read again it gives the same value
    expect(readInput('+44 7400 123456', 'US', false)).toMatchObject({ country: 'GB', value: '+447400123456', text: '07400123456' });
    expect(readInput('+7 812 1234567', 'GB', false)).toMatchObject({ country: 'RU', value: '+78121234567', text: '88121234567' });
    expect(readInput('88121234567', 'RU', false).value).toBe('+78121234567');
    expect(readInput('0044 7400 123456', 'DE', false)).toMatchObject({ country: 'GB', value: '+447400123456' });
    // A shared code keeps the picked region when the number fits it, else takes the one the number names
    expect(readInput('+1 201 555 0123', 'CA', false).country).toBe('CA');
    expect(readInput('+1 416 555 0123', 'GB', false).country).toBe('CA');
    // A code still being typed stays as it is
    expect(readInput('+4', 'GB', false)).toMatchObject({ country: 'GB', text: '+4', value: '' });
  });

  it('takes no more digits than the region’s longest number', () => {
    expect(tooLong('07400123456', 'GB')).toBe(false);
    expect(tooLong('074001234567', 'GB')).toBe(true);
    // A pasted international number too
    expect(tooLongValue('+4474001234567')).toBe(true);
    expect(tooLongValue('+447400123456')).toBe(false);
  });

  it('reads a value from outside', () => {
    expect(readValue('+447400123456', 'US', false)).toMatchObject({ country: 'GB', text: '07400123456' });
    // The digits so far after a code come back as they were
    expect(readValue('+447', 'US', false)).toMatchObject({ country: 'GB', text: '7', value: '+447' });
    expect(readValue('', 'GB', false).text).toBe('');
  });

  it('lists the regions of a shared code, the main one first', () => {
    expect(countriesForCode('1')[0]).toBe('US');
    expect(countriesForCode('44')).toEqual(['GB', 'GG', 'IM', 'JE']);
    expect(countriesForCode('7')).toEqual(['RU', 'KZ']);
  });

  it('names, flags and finds the regions', () => {
    expect(countryName('GB', 'en')).toBe('United Kingdom');
    expect(countryName('DE', 'de')).toBe('Deutschland');
    expect(countryFlag('GB')).toBe('🇬🇧');
    expect(matchesCountry('GB', 'United Kingdom', 'king')).toBe(true);
    expect(matchesCountry('GB', 'United Kingdom', '+44')).toBe(true);
    expect(matchesCountry('GB', 'United Kingdom', 'gb')).toBe(true);
    expect(matchesCountry('CI', 'Côte d’Ivoire', 'cote')).toBe(true);
    expect(matchesCountry('DZ', 'Algeria', 'ger')).toBe(false);
  });

  it('counts digits and places the caret after them', () => {
    expect(digitsOf('(201) 555-0123')).toBe('2015550123');
    expect(caretAfterDigits('07400 123456', 5)).toBe(5);
    expect(caretAfterDigits('07400 123456', 6)).toBe(7);
    expect(readNational('7400123456', 'GB', false).value).toBe('+447400123456');
  });
});
