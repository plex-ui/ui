/** VPN settings, as Settings › VPN lays them out (IMG_5959): the status with its switch, then the configurations of the
 * device, one chosen. */
export type VpnSettings = { connected: boolean; chosen: string };

export const vpnConfigurations = [
  { id: 'office', name: 'Office', type: 'Northwind Corporate' },
  { id: 'home', name: 'Home Server', type: 'WireGuard' },
  { id: 'travel', name: 'Travel', type: 'Northwind Secure' },
  { id: 'studio', name: 'Studio', type: 'IKEv2' },
];

export const initialVpn: VpnSettings = { connected: false, chosen: 'office' };

/** TV providers, as Settings › TV Provider lays them out (IMG_5958). */
export const tvProviders = ['Northwind TV', 'Contoso Cable'];
