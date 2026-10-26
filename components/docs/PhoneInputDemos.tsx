'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Input } from '@plexui/ui/components/Input';
import { Select, type Option } from '@plexui/ui/components/Select';
import { Field } from '@plexui/ui/components/Field';
import { Button } from '@plexui/ui/components/Button';
import { FieldError } from '@plexui/ui/components/FieldError';
import { Switch } from '@plexui/ui/components/Switch';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';

// ============================================================
// Country data
// ============================================================

type Country = {
  value: string;
  label: string;
  dialCode: string;
  flag: string;
};

export const COUNTRIES: Country[] = [
  { value: 'af', label: 'Afghanistan', dialCode: '+93', flag: '🇦🇫' },
  { value: 'al', label: 'Albania', dialCode: '+355', flag: '🇦🇱' },
  { value: 'dz', label: 'Algeria', dialCode: '+213', flag: '🇩🇿' },
  { value: 'as', label: 'American Samoa', dialCode: '+1684', flag: '🇦🇸' },
  { value: 'ad', label: 'Andorra', dialCode: '+376', flag: '🇦🇩' },
  { value: 'ao', label: 'Angola', dialCode: '+244', flag: '🇦🇴' },
  { value: 'ai', label: 'Anguilla', dialCode: '+1264', flag: '🇦🇮' },
  { value: 'ag', label: 'Antigua and Barbuda', dialCode: '+1268', flag: '🇦🇬' },
  { value: 'ar', label: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { value: 'am', label: 'Armenia', dialCode: '+374', flag: '🇦🇲' },
  { value: 'aw', label: 'Aruba', dialCode: '+297', flag: '🇦🇼' },
  { value: 'au', label: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { value: 'at', label: 'Austria', dialCode: '+43', flag: '🇦🇹' },
  { value: 'az', label: 'Azerbaijan', dialCode: '+994', flag: '🇦🇿' },
  { value: 'bs', label: 'Bahamas', dialCode: '+1242', flag: '🇧🇸' },
  { value: 'bh', label: 'Bahrain', dialCode: '+973', flag: '🇧🇭' },
  { value: 'bd', label: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
  { value: 'bb', label: 'Barbados', dialCode: '+1246', flag: '🇧🇧' },
  { value: 'by', label: 'Belarus', dialCode: '+375', flag: '🇧🇾' },
  { value: 'be', label: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
  { value: 'bz', label: 'Belize', dialCode: '+501', flag: '🇧🇿' },
  { value: 'bj', label: 'Benin', dialCode: '+229', flag: '🇧🇯' },
  { value: 'bm', label: 'Bermuda', dialCode: '+1441', flag: '🇧🇲' },
  { value: 'bt', label: 'Bhutan', dialCode: '+975', flag: '🇧🇹' },
  { value: 'bo', label: 'Bolivia', dialCode: '+591', flag: '🇧🇴' },
  { value: 'ba', label: 'Bosnia and Herzegovina', dialCode: '+387', flag: '🇧🇦' },
  { value: 'bw', label: 'Botswana', dialCode: '+267', flag: '🇧🇼' },
  { value: 'br', label: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
  { value: 'bn', label: 'Brunei', dialCode: '+673', flag: '🇧🇳' },
  { value: 'bg', label: 'Bulgaria', dialCode: '+359', flag: '🇧🇬' },
  { value: 'bf', label: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫' },
  { value: 'bi', label: 'Burundi', dialCode: '+257', flag: '🇧🇮' },
  { value: 'kh', label: 'Cambodia', dialCode: '+855', flag: '🇰🇭' },
  { value: 'cm', label: 'Cameroon', dialCode: '+237', flag: '🇨🇲' },
  { value: 'ca', label: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { value: 'cv', label: 'Cape Verde', dialCode: '+238', flag: '🇨🇻' },
  { value: 'ky', label: 'Cayman Islands', dialCode: '+1345', flag: '🇰🇾' },
  { value: 'cf', label: 'Central African Republic', dialCode: '+236', flag: '🇨🇫' },
  { value: 'td', label: 'Chad', dialCode: '+235', flag: '🇹🇩' },
  { value: 'cl', label: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { value: 'cn', label: 'China', dialCode: '+86', flag: '🇨🇳' },
  { value: 'co', label: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { value: 'km', label: 'Comoros', dialCode: '+269', flag: '🇰🇲' },
  { value: 'cg', label: 'Congo', dialCode: '+242', flag: '🇨🇬' },
  { value: 'cd', label: 'Congo (DRC)', dialCode: '+243', flag: '🇨🇩' },
  { value: 'ck', label: 'Cook Islands', dialCode: '+682', flag: '🇨🇰' },
  { value: 'cr', label: 'Costa Rica', dialCode: '+506', flag: '🇨🇷' },
  { value: 'ci', label: "C\u00f4te d'Ivoire", dialCode: '+225', flag: '🇨🇮' },
  { value: 'hr', label: 'Croatia', dialCode: '+385', flag: '🇭🇷' },
  { value: 'cu', label: 'Cuba', dialCode: '+53', flag: '🇨🇺' },
  { value: 'cw', label: 'Cura\u00e7ao', dialCode: '+599', flag: '🇨🇼' },
  { value: 'cy', label: 'Cyprus', dialCode: '+357', flag: '🇨🇾' },
  { value: 'cz', label: 'Czech Republic', dialCode: '+420', flag: '🇨🇿' },
  { value: 'dk', label: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
  { value: 'dj', label: 'Djibouti', dialCode: '+253', flag: '🇩🇯' },
  { value: 'dm', label: 'Dominica', dialCode: '+1767', flag: '🇩🇲' },
  { value: 'do', label: 'Dominican Republic', dialCode: '+1809', flag: '🇩🇴' },
  { value: 'ec', label: 'Ecuador', dialCode: '+593', flag: '🇪🇨' },
  { value: 'eg', label: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { value: 'sv', label: 'El Salvador', dialCode: '+503', flag: '🇸🇻' },
  { value: 'gq', label: 'Equatorial Guinea', dialCode: '+240', flag: '🇬🇶' },
  { value: 'er', label: 'Eritrea', dialCode: '+291', flag: '🇪🇷' },
  { value: 'ee', label: 'Estonia', dialCode: '+372', flag: '🇪🇪' },
  { value: 'sz', label: 'Eswatini', dialCode: '+268', flag: '🇸🇿' },
  { value: 'et', label: 'Ethiopia', dialCode: '+251', flag: '🇪🇹' },
  { value: 'fk', label: 'Falkland Islands', dialCode: '+500', flag: '🇫🇰' },
  { value: 'fo', label: 'Faroe Islands', dialCode: '+298', flag: '🇫🇴' },
  { value: 'fj', label: 'Fiji', dialCode: '+679', flag: '🇫🇯' },
  { value: 'fi', label: 'Finland', dialCode: '+358', flag: '🇫🇮' },
  { value: 'fr', label: 'France', dialCode: '+33', flag: '🇫🇷' },
  { value: 'gf', label: 'French Guiana', dialCode: '+594', flag: '🇬🇫' },
  { value: 'pf', label: 'French Polynesia', dialCode: '+689', flag: '🇵🇫' },
  { value: 'ga', label: 'Gabon', dialCode: '+241', flag: '🇬🇦' },
  { value: 'gm', label: 'Gambia', dialCode: '+220', flag: '🇬🇲' },
  { value: 'ge', label: 'Georgia', dialCode: '+995', flag: '🇬🇪' },
  { value: 'de', label: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { value: 'gh', label: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
  { value: 'gi', label: 'Gibraltar', dialCode: '+350', flag: '🇬🇮' },
  { value: 'gr', label: 'Greece', dialCode: '+30', flag: '🇬🇷' },
  { value: 'gl', label: 'Greenland', dialCode: '+299', flag: '🇬🇱' },
  { value: 'gd', label: 'Grenada', dialCode: '+1473', flag: '🇬🇩' },
  { value: 'gp', label: 'Guadeloupe', dialCode: '+590', flag: '🇬🇵' },
  { value: 'gu', label: 'Guam', dialCode: '+1671', flag: '🇬🇺' },
  { value: 'gt', label: 'Guatemala', dialCode: '+502', flag: '🇬🇹' },
  { value: 'gn', label: 'Guinea', dialCode: '+224', flag: '🇬🇳' },
  { value: 'gw', label: 'Guinea-Bissau', dialCode: '+245', flag: '🇬🇼' },
  { value: 'gy', label: 'Guyana', dialCode: '+592', flag: '🇬🇾' },
  { value: 'ht', label: 'Haiti', dialCode: '+509', flag: '🇭🇹' },
  { value: 'hn', label: 'Honduras', dialCode: '+504', flag: '🇭🇳' },
  { value: 'hk', label: 'Hong Kong', dialCode: '+852', flag: '🇭🇰' },
  { value: 'hu', label: 'Hungary', dialCode: '+36', flag: '🇭🇺' },
  { value: 'is', label: 'Iceland', dialCode: '+354', flag: '🇮🇸' },
  { value: 'in', label: 'India', dialCode: '+91', flag: '🇮🇳' },
  { value: 'id', label: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },
  { value: 'ir', label: 'Iran', dialCode: '+98', flag: '🇮🇷' },
  { value: 'iq', label: 'Iraq', dialCode: '+964', flag: '🇮🇶' },
  { value: 'ie', label: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
  { value: 'il', label: 'Israel', dialCode: '+972', flag: '🇮🇱' },
  { value: 'it', label: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { value: 'jm', label: 'Jamaica', dialCode: '+1876', flag: '🇯🇲' },
  { value: 'jp', label: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { value: 'jo', label: 'Jordan', dialCode: '+962', flag: '🇯🇴' },
  { value: 'kz', label: 'Kazakhstan', dialCode: '+7', flag: '🇰🇿' },
  { value: 'ke', label: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { value: 'ki', label: 'Kiribati', dialCode: '+686', flag: '🇰🇮' },
  { value: 'xk', label: 'Kosovo', dialCode: '+383', flag: '🇽🇰' },
  { value: 'kw', label: 'Kuwait', dialCode: '+965', flag: '🇰🇼' },
  { value: 'kg', label: 'Kyrgyzstan', dialCode: '+996', flag: '🇰🇬' },
  { value: 'la', label: 'Laos', dialCode: '+856', flag: '🇱🇦' },
  { value: 'lv', label: 'Latvia', dialCode: '+371', flag: '🇱🇻' },
  { value: 'lb', label: 'Lebanon', dialCode: '+961', flag: '🇱🇧' },
  { value: 'ls', label: 'Lesotho', dialCode: '+266', flag: '🇱🇸' },
  { value: 'lr', label: 'Liberia', dialCode: '+231', flag: '🇱🇷' },
  { value: 'ly', label: 'Libya', dialCode: '+218', flag: '🇱🇾' },
  { value: 'li', label: 'Liechtenstein', dialCode: '+423', flag: '🇱🇮' },
  { value: 'lt', label: 'Lithuania', dialCode: '+370', flag: '🇱🇹' },
  { value: 'lu', label: 'Luxembourg', dialCode: '+352', flag: '🇱🇺' },
  { value: 'mo', label: 'Macao', dialCode: '+853', flag: '🇲🇴' },
  { value: 'mg', label: 'Madagascar', dialCode: '+261', flag: '🇲🇬' },
  { value: 'mw', label: 'Malawi', dialCode: '+265', flag: '🇲🇼' },
  { value: 'my', label: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { value: 'mv', label: 'Maldives', dialCode: '+960', flag: '🇲🇻' },
  { value: 'ml', label: 'Mali', dialCode: '+223', flag: '🇲🇱' },
  { value: 'mt', label: 'Malta', dialCode: '+356', flag: '🇲🇹' },
  { value: 'mh', label: 'Marshall Islands', dialCode: '+692', flag: '🇲🇭' },
  { value: 'mq', label: 'Martinique', dialCode: '+596', flag: '🇲🇶' },
  { value: 'mr', label: 'Mauritania', dialCode: '+222', flag: '🇲🇷' },
  { value: 'mu', label: 'Mauritius', dialCode: '+230', flag: '🇲🇺' },
  { value: 'mx', label: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
  { value: 'fm', label: 'Micronesia', dialCode: '+691', flag: '🇫🇲' },
  { value: 'md', label: 'Moldova', dialCode: '+373', flag: '🇲🇩' },
  { value: 'mc', label: 'Monaco', dialCode: '+377', flag: '🇲🇨' },
  { value: 'mn', label: 'Mongolia', dialCode: '+976', flag: '🇲🇳' },
  { value: 'me', label: 'Montenegro', dialCode: '+382', flag: '🇲🇪' },
  { value: 'ms', label: 'Montserrat', dialCode: '+1664', flag: '🇲🇸' },
  { value: 'ma', label: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
  { value: 'mz', label: 'Mozambique', dialCode: '+258', flag: '🇲🇿' },
  { value: 'mm', label: 'Myanmar', dialCode: '+95', flag: '🇲🇲' },
  { value: 'na', label: 'Namibia', dialCode: '+264', flag: '🇳🇦' },
  { value: 'nr', label: 'Nauru', dialCode: '+674', flag: '🇳🇷' },
  { value: 'np', label: 'Nepal', dialCode: '+977', flag: '🇳🇵' },
  { value: 'nl', label: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { value: 'nc', label: 'New Caledonia', dialCode: '+687', flag: '🇳🇨' },
  { value: 'nz', label: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
  { value: 'ni', label: 'Nicaragua', dialCode: '+505', flag: '🇳🇮' },
  { value: 'ne', label: 'Niger', dialCode: '+227', flag: '🇳🇪' },
  { value: 'ng', label: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { value: 'kp', label: 'North Korea', dialCode: '+850', flag: '🇰🇵' },
  { value: 'mk', label: 'North Macedonia', dialCode: '+389', flag: '🇲🇰' },
  { value: 'no', label: 'Norway', dialCode: '+47', flag: '🇳🇴' },
  { value: 'om', label: 'Oman', dialCode: '+968', flag: '🇴🇲' },
  { value: 'pk', label: 'Pakistan', dialCode: '+92', flag: '🇵🇰' },
  { value: 'pw', label: 'Palau', dialCode: '+680', flag: '🇵🇼' },
  { value: 'ps', label: 'Palestine', dialCode: '+970', flag: '🇵🇸' },
  { value: 'pa', label: 'Panama', dialCode: '+507', flag: '🇵🇦' },
  { value: 'pg', label: 'Papua New Guinea', dialCode: '+675', flag: '🇵🇬' },
  { value: 'py', label: 'Paraguay', dialCode: '+595', flag: '🇵🇾' },
  { value: 'pe', label: 'Peru', dialCode: '+51', flag: '🇵🇪' },
  { value: 'ph', label: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { value: 'pl', label: 'Poland', dialCode: '+48', flag: '🇵🇱' },
  { value: 'pt', label: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { value: 'pr', label: 'Puerto Rico', dialCode: '+1787', flag: '🇵🇷' },
  { value: 'qa', label: 'Qatar', dialCode: '+974', flag: '🇶🇦' },
  { value: 're', label: 'R\u00e9union', dialCode: '+262', flag: '🇷🇪' },
  { value: 'ro', label: 'Romania', dialCode: '+40', flag: '🇷🇴' },
  { value: 'ru', label: 'Russia', dialCode: '+7', flag: '🇷🇺' },
  { value: 'rw', label: 'Rwanda', dialCode: '+250', flag: '🇷🇼' },
  { value: 'kn', label: 'Saint Kitts and Nevis', dialCode: '+1869', flag: '🇰🇳' },
  { value: 'lc', label: 'Saint Lucia', dialCode: '+1758', flag: '🇱🇨' },
  { value: 'vc', label: 'Saint Vincent and the Grenadines', dialCode: '+1784', flag: '🇻🇨' },
  { value: 'ws', label: 'Samoa', dialCode: '+685', flag: '🇼🇸' },
  { value: 'sm', label: 'San Marino', dialCode: '+378', flag: '🇸🇲' },
  { value: 'st', label: 'S\u00e3o Tom\u00e9 and Pr\u00edncipe', dialCode: '+239', flag: '🇸🇹' },
  { value: 'sa', label: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { value: 'sn', label: 'Senegal', dialCode: '+221', flag: '🇸🇳' },
  { value: 'rs', label: 'Serbia', dialCode: '+381', flag: '🇷🇸' },
  { value: 'sc', label: 'Seychelles', dialCode: '+248', flag: '🇸🇨' },
  { value: 'sl', label: 'Sierra Leone', dialCode: '+232', flag: '🇸🇱' },
  { value: 'sg', label: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { value: 'sk', label: 'Slovakia', dialCode: '+421', flag: '🇸🇰' },
  { value: 'si', label: 'Slovenia', dialCode: '+386', flag: '🇸🇮' },
  { value: 'sb', label: 'Solomon Islands', dialCode: '+677', flag: '🇸🇧' },
  { value: 'so', label: 'Somalia', dialCode: '+252', flag: '🇸🇴' },
  { value: 'za', label: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { value: 'kr', label: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { value: 'ss', label: 'South Sudan', dialCode: '+211', flag: '🇸🇸' },
  { value: 'es', label: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { value: 'lk', label: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },
  { value: 'sd', label: 'Sudan', dialCode: '+249', flag: '🇸🇩' },
  { value: 'sr', label: 'Suriname', dialCode: '+597', flag: '🇸🇷' },
  { value: 'se', label: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
  { value: 'ch', label: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
  { value: 'sy', label: 'Syria', dialCode: '+963', flag: '🇸🇾' },
  { value: 'tw', label: 'Taiwan', dialCode: '+886', flag: '🇹🇼' },
  { value: 'tj', label: 'Tajikistan', dialCode: '+992', flag: '🇹🇯' },
  { value: 'tz', label: 'Tanzania', dialCode: '+255', flag: '🇹🇿' },
  { value: 'th', label: 'Thailand', dialCode: '+66', flag: '🇹🇭' },
  { value: 'tl', label: 'Timor-Leste', dialCode: '+670', flag: '🇹🇱' },
  { value: 'tg', label: 'Togo', dialCode: '+228', flag: '🇹🇬' },
  { value: 'to', label: 'Tonga', dialCode: '+676', flag: '🇹🇴' },
  { value: 'tt', label: 'Trinidad and Tobago', dialCode: '+1868', flag: '🇹🇹' },
  { value: 'tn', label: 'Tunisia', dialCode: '+216', flag: '🇹🇳' },
  { value: 'tr', label: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
  { value: 'tm', label: 'Turkmenistan', dialCode: '+993', flag: '🇹🇲' },
  { value: 'tc', label: 'Turks and Caicos Islands', dialCode: '+1649', flag: '🇹🇨' },
  { value: 'tv', label: 'Tuvalu', dialCode: '+688', flag: '🇹🇻' },
  { value: 'ug', label: 'Uganda', dialCode: '+256', flag: '🇺🇬' },
  { value: 'ua', label: 'Ukraine', dialCode: '+380', flag: '🇺🇦' },
  { value: 'ae', label: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
  { value: 'gb', label: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { value: 'us', label: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { value: 'uy', label: 'Uruguay', dialCode: '+598', flag: '🇺🇾' },
  { value: 'uz', label: 'Uzbekistan', dialCode: '+998', flag: '🇺🇿' },
  { value: 'vu', label: 'Vanuatu', dialCode: '+678', flag: '🇻🇺' },
  { value: 'va', label: 'Vatican City', dialCode: '+379', flag: '🇻🇦' },
  { value: 've', label: 'Venezuela', dialCode: '+58', flag: '🇻🇪' },
  { value: 'vn', label: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
  { value: 'vg', label: 'Virgin Islands (British)', dialCode: '+1284', flag: '🇻🇬' },
  { value: 'vi', label: 'Virgin Islands (U.S.)', dialCode: '+1340', flag: '🇻🇮' },
  { value: 'ye', label: 'Yemen', dialCode: '+967', flag: '🇾🇪' },
  { value: 'zm', label: 'Zambia', dialCode: '+260', flag: '🇿🇲' },
  { value: 'zw', label: 'Zimbabwe', dialCode: '+263', flag: '🇿🇼' },
];

export const COUNTRY_LOOKUP = new Map(COUNTRIES.map((c) => [c.value, c]));

export const COUNTRY_OPTIONS: Country[] = COUNTRIES.map((c) => ({
  ...c,
  label: `${c.label} (${c.dialCode})`,
}));


export const COUNTRY_OPTION_CLASS = 'phone-country-option';
export const COUNTRY_OPTION_STYLE = `.${COUNTRY_OPTION_CLASS} > div > div:first-child > div:first-child { order: 1; margin-left: auto; }`;

// ============================================================
// Per-country phone number formatting patterns
// ============================================================

const PHONE_FORMATS: Record<string, number[]> = {
  // North America
  us: [3, 3, 4], ca: [3, 3, 4], mx: [2, 4, 4], jm: [3, 4],
  pr: [3, 3, 4], tt: [3, 4],
  // Europe
  gb: [4, 3, 3], de: [3, 4, 4], fr: [1, 2, 2, 2, 2], es: [3, 2, 2, 2],
  it: [3, 3, 4], pt: [3, 3, 3], nl: [2, 3, 4], be: [3, 2, 2, 2],
  at: [3, 3, 4], ch: [2, 3, 2, 2], se: [2, 3, 2, 2], no: [3, 2, 3],
  dk: [2, 2, 2, 2], fi: [2, 3, 4], pl: [3, 3, 3], cz: [3, 3, 3],
  ie: [2, 3, 4], ro: [3, 3, 3], hu: [2, 3, 4], gr: [3, 3, 4],
  bg: [3, 3, 3], hr: [2, 3, 3], sk: [3, 3, 3], si: [2, 3, 2, 2],
  rs: [2, 3, 4], ee: [3, 4], lv: [2, 3, 3], lt: [3, 2, 3],
  ua: [2, 3, 2, 2], ru: [3, 3, 2, 2], tr: [3, 3, 2, 2],
  is: [3, 4], lu: [3, 3], mt: [4, 4], cy: [2, 6],
  al: [3, 3, 3], ba: [2, 3, 3], me: [2, 3, 3], mk: [2, 3, 3],
  md: [2, 3, 3], by: [2, 3, 2, 2], ge: [3, 2, 2, 2],
  am: [2, 3, 3], az: [2, 3, 2, 2], mc: [4, 4], li: [3, 2, 2],
  // Asia & Pacific
  jp: [2, 4, 4], kr: [2, 4, 4], cn: [3, 4, 4], in: [5, 5],
  sg: [4, 4], hk: [4, 4], tw: [3, 3, 3], th: [2, 3, 4],
  id: [3, 4, 4], my: [2, 4, 4], ph: [3, 3, 4], vn: [2, 3, 4],
  kh: [2, 3, 3], mm: [2, 3, 4], la: [2, 4, 4], bn: [3, 4],
  kz: [3, 3, 2, 2], uz: [2, 3, 2, 2], kg: [3, 3, 3],
  tj: [2, 3, 4], tm: [2, 3, 4], mn: [4, 4],
  pk: [3, 3, 4], bd: [4, 3, 3], lk: [2, 3, 4], np: [3, 3, 4],
  // Middle East & Africa
  ae: [2, 3, 4], sa: [2, 3, 4], il: [2, 3, 4], jo: [1, 4, 4],
  lb: [1, 3, 3], kw: [4, 4], qa: [4, 4], bh: [4, 4],
  om: [4, 4], iq: [3, 3, 4], ir: [3, 3, 4],
  za: [2, 3, 4], ng: [3, 3, 4], eg: [3, 3, 4], ke: [3, 3, 3],
  gh: [2, 3, 4], tz: [3, 3, 3], ug: [3, 3, 3], et: [2, 3, 4],
  ma: [4, 6], tn: [2, 3, 3], dz: [3, 2, 2, 2],
  // South America
  br: [2, 5, 4], ar: [2, 4, 4], cl: [1, 4, 4], co: [3, 3, 4],
  pe: [3, 3, 3], ve: [3, 3, 4], ec: [2, 3, 4], uy: [2, 3, 2],
  py: [3, 3, 3], bo: [1, 3, 4],
  // Oceania
  au: [3, 3, 3], nz: [3, 3, 3], fj: [3, 4],
};

const DEFAULT_PHONE_FORMAT = [3, 3, 4];

// ============================================================
// Flag icon component (SVG flags from lipis/flag-icons, all 4:3)
// ============================================================

function FlagIcon({ code, trigger }: { code: string; trigger?: boolean }) {
  return (
    <span
      style={{
        display: 'block',
        height: trigger ? 'var(--start-icon-size, 18px)' : 16,
        aspectRatio: '4 / 3',
        borderRadius: 2,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <img
        src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.5.0/flags/4x3/${code}.svg`}
        alt=""
        loading="lazy"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </span>
  );
}


export function formatPhoneNumber(raw: string, countryCode?: string): string {
  const allDigits = raw.replace(/\D/g, '');
  if (!allDigits) return '';
  const format = (countryCode && PHONE_FORMATS[countryCode]) || DEFAULT_PHONE_FORMAT;
  const maxDigits = format.reduce((sum, n) => sum + n, 0);
  const digits = allDigits.slice(0, maxDigits);
  const groups: string[] = [];
  let i = 0;
  for (const groupSize of format) {
    if (i >= digits.length) break;
    groups.push(digits.slice(i, i + groupSize));
    i += groupSize;
  }
  return groups.join(' ');
}

export function stripFormatting(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

// ============================================================
// Demo infrastructure (matching existing pattern)
// ============================================================

const controlsTableStyle: React.CSSProperties = {
  background: 'var(--docs-surface-elevated)',
  width: '100%',
};

const controlRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px 6px 8px',
  borderTop: '1px solid var(--color-fd-border)',
};

const controlLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: '0.8125rem',
  padding: '2px 8px',
};

function DemoControlBoolean({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const controlId = "demo-switch-" + name.toLowerCase().replace(/\s+/g, "-");
  return (
    <div style={controlRowStyle}>
      <label htmlFor={controlId} style={controlLabelStyle}>{name}</label>
      <Switch id={controlId} checked={value} onCheckedChange={onChange} aria-label={name} />
    </div>
  );
}

function DemoControlRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={controlRowStyle}>
      <span style={controlLabelStyle}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

const SIZE_OPTIONS = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

// ============================================================
// Custom views for country select
// ============================================================

const CountryTriggerView = ({ value, label }: Option) => {
  const country = COUNTRY_LOOKUP.get(value);
  if (!country) return <>{label}</>;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, height: '100%', overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <FlagIcon code={value} trigger />
      {country.label} ({country.dialCode})
    </span>
  );
};

const CountryOptionView = ({ value, label }: Option) => {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, verticalAlign: 'middle', lineHeight: 0 }}>
      <FlagIcon code={value} />
      {label}
    </span>
  );
};

const CountryNameTriggerView = ({ value, label }: Option) => {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, height: '100%', overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <FlagIcon code={value} trigger />
      {label}
    </span>
  );
};

const CountryNameOptionView = ({ value, label }: Option) => {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, verticalAlign: 'middle', lineHeight: 0 }}>
      <FlagIcon code={value} />
      {label}
    </span>
  );
};


export const countrySearchPredicate = (option: Option, searchTerm: string): boolean => {
  const country = COUNTRY_LOOKUP.get(option.value);
  if (!country) return option.label.toLowerCase().includes(searchTerm);
  return (
    country.label.toLowerCase().includes(searchTerm) ||
    country.dialCode.includes(searchTerm)
  );
};

// ============================================================
// Demo 1: Country Code Selector
// ============================================================

export function CountryCodeSelectorDemo() {
  const [country, setCountry] = useState('us');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [pill, setPill] = useState(false);
  const [variant, setVariant] = useState<'outline' | 'soft'>('outline');

  return (
    <>
      <style>{COUNTRY_OPTION_STYLE}</style>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl<(typeof SIZE_OPTIONS)[number]>
            value={size}
            onChange={setSize}
            aria-label="size"
            size="xs"
          >
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>
                {s}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="variant">
          <SegmentedControl<'outline' | 'soft'>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            <SegmentedControl.Option value="outline">outline</SegmentedControl.Option>
            <SegmentedControl.Option value="soft">soft</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>
      <div data-demo-stage className="py-10">
        <div className="w-[320px]">
          <Select
            value={country}
            options={COUNTRY_OPTIONS}
            onChange={(option) => setCountry(option.value)}
            placeholder="Select country..."
            size={size}
            variant={variant}
            pill={pill}
            block
            searchPlaceholder="Search countries..."
            searchPredicate={countrySearchPredicate}
            TriggerView={CountryTriggerView}
            OptionView={CountryOptionView}
            listMinWidth={300}
            optionClassName={COUNTRY_OPTION_CLASS}
          />
        </div>
      </div>
    </>
  );
}


// ============================================================
// Demo 1b: Country Selector (no dial codes)
// ============================================================

export function CountrySelectorDemo() {
  const [country, setCountry] = useState('us');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [pill, setPill] = useState(false);
  const [variant, setVariant] = useState<'outline' | 'soft'>('outline');

  return (
    <>
      <style>{COUNTRY_OPTION_STYLE}</style>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl<(typeof SIZE_OPTIONS)[number]>
            value={size}
            onChange={setSize}
            aria-label="size"
            size="xs"
          >
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>
                {s}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="variant">
          <SegmentedControl<'outline' | 'soft'>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            <SegmentedControl.Option value="outline">outline</SegmentedControl.Option>
            <SegmentedControl.Option value="soft">soft</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>
      <div data-demo-stage className="py-10">
        <div className="w-[320px]">
          <Select
            value={country}
            options={COUNTRIES}
            onChange={(option) => setCountry(option.value)}
            placeholder="Select country..."
            size={size}
            variant={variant}
            pill={pill}
            block
            searchPlaceholder="Search countries..."
            TriggerView={CountryNameTriggerView}
            OptionView={CountryNameOptionView}
            listMinWidth={300}
            optionClassName={COUNTRY_OPTION_CLASS}
          />
        </div>
      </div>
    </>
  );
}


// ============================================================
// Demo 3: Combined Phone Form (Country Selector + Phone Input)
// ============================================================

export function PhoneFormDemo() {
  const [country, setCountry] = useState('es');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('lg');
  const [pill, setPill] = useState(false);

  const phoneInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = COUNTRY_LOOKUP.get(country);
  const dialCode = selectedCountry?.dialCode ?? '+1';

  const handlePhoneChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    const raw = evt.target.value.replace(/\D/g, '');
    setPhone(formatPhoneNumber(raw, country));
    setSubmitted(false);
  }, [country]);

  const handleCountryChange = useCallback((option: Option) => {
    setCountry(option.value);
    setPhone('');
    setSubmitted(false);
    setTimeout(() => phoneInputRef.current?.focus(), 0);
  }, []);

  const digits = stripFormatting(phone);
  const isPhoneValid = digits.length >= 7 && digits.length <= 15;
  const showError = submitted && !isPhoneValid;

  const handleSubmit = (evt: React.FormEvent) => {
    evt.preventDefault();
    setSubmitted(true);
    if (isPhoneValid) {

    }
  };

  return (
    <>
      <style>{COUNTRY_OPTION_STYLE}</style>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl<(typeof SIZE_OPTIONS)[number]>
            value={size}
            onChange={setSize}
            aria-label="size"
            size="xs"
          >
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>
                {s}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
      </div>
      <div data-demo-stage className="py-10">
        <form onSubmit={handleSubmit} className="w-[360px]" noValidate>
          <div className="flex flex-col gap-2">
            <Select
              value={country}
              options={COUNTRY_OPTIONS}
              onChange={handleCountryChange}
              placeholder="Select country..."
              size={size}
              variant="outline"
              pill={pill}
              block
              searchPlaceholder="Search countries..."
              searchPredicate={countrySearchPredicate}
              TriggerView={CountryTriggerView}
              OptionView={CountryOptionView}
              listMinWidth={300}
              optionClassName={COUNTRY_OPTION_CLASS}
            />
            <div>
              <Input
                ref={phoneInputRef}
                value={phone}
                onChange={handlePhoneChange}
                placeholder="Phone number"
                type="tel"
                inputMode="tel"
                size={size}
                variant="outline"
                pill={pill}
                invalid={showError}
                startAdornment={
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: 'var(--input-size)', lineHeight: 0 }} className="text-tertiary whitespace-nowrap select-none">{dialCode}</span>
                }
              />
              {showError && (
                <FieldError className="mt-1.5">Phone number is not valid.</FieldError>
              )}
            </div>
          </div>
          <Button
            type="submit"
            color="primary"
            variant="solid"
            size={size}
            pill={pill}
            className="w-full mt-3"
          >
            Continue
          </Button>
        </form>
      </div>
    </>
  );
}

// ============================================================
// Demo 4: With Field labels
// ============================================================

export function PhoneFieldDemo() {
  const [country, setCountry] = useState('us');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const phoneInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = COUNTRY_LOOKUP.get(country);
  const dialCode = selectedCountry?.dialCode ?? '+1';

  const handlePhoneChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    const raw = evt.target.value.replace(/\D/g, '');
    setPhone(formatPhoneNumber(raw, country));
    setSubmitted(false);
  }, [country]);

  const digits = stripFormatting(phone);
  const isPhoneValid = digits.length >= 7 && digits.length <= 15;
  const showError = submitted && !isPhoneValid;

  const handleSubmit = (evt: React.FormEvent) => {
    evt.preventDefault();
    setSubmitted(true);
  };

  return (
    <div data-demo-stage className="py-10">
      <form onSubmit={handleSubmit} className="w-[360px]" noValidate>
        <div className="flex flex-col gap-4">
          <Field label="Country" size="lg">
            {(fieldProps) => (
              <Select
                id={fieldProps.id}
                value={country}
                options={COUNTRY_OPTIONS}
                onChange={(option) => {
                  setCountry(option.value);
                  setPhone('');
                  setSubmitted(false);
                  setTimeout(() => phoneInputRef.current?.focus(), 0);
                }}
                placeholder="Select country..."
                size="lg"
                variant="outline"
                pill
                block
                searchPlaceholder="Search countries..."
                searchPredicate={countrySearchPredicate}
                TriggerView={CountryTriggerView}
                OptionView={CountryOptionView}
                listMinWidth={300}
              />
            )}
          </Field>
          <Field
            label="Phone number"
            description="We'll send a verification code to this number."
            errorMessage={showError ? 'Phone number is not valid.' : undefined}
            size="lg"
          >
            <Input
              ref={phoneInputRef}
              value={phone}
              onChange={handlePhoneChange}
              placeholder="Phone number"
              type="tel"
              inputMode="tel"
              size="lg"
              variant="outline"
              pill
              startAdornment={
                <span style={{ display: 'inline-flex', alignItems: 'center', height: 'var(--input-size)', lineHeight: 0 }} className="text-tertiary whitespace-nowrap select-none">{dialCode}</span>
              }
            />
          </Field>
        </div>
        <Button
          type="submit"
          color="primary"
          variant="solid"
          size="lg"
          pill
          className="w-full mt-5"
        >
          Send verification code
        </Button>
      </form>
    </div>
  );
}
