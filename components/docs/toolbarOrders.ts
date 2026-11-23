/**
 * The orders of the Toolbar and Page examples, newest first: each row names the customer, with the order's number and
 * status under it and its total at the end. Three are unpaid, as the Unpaid segment's badge counts, and three
 * refunded. One list for React, Vue and React Native.
 */
export type OrderStatus = 'Paid' | 'Unpaid' | 'Refunded';

export type Order = { number: string; customer: string; total: string; status: OrderStatus };

/** The views of the orders a segmented row switches */
export type OrderView = 'all' | 'paid' | 'unpaid' | 'refunded';

export const ORDERS: Order[] = [
  { number: '#1047', customer: 'Anna Kim', total: '$86.40', status: 'Unpaid' },
  { number: '#1046', customer: 'Ben Carter', total: '$42.15', status: 'Paid' },
  { number: '#1045', customer: 'Maya Patel', total: '$128.00', status: 'Paid' },
  { number: '#1044', customer: 'Sofia Rossi', total: '$64.50', status: 'Unpaid' },
  { number: '#1043', customer: 'Omar Haddad', total: '$210.75', status: 'Paid' },
  { number: '#1042', customer: 'Chen Wei', total: '$37.80', status: 'Refunded' },
  { number: '#1041', customer: 'Lucas Silva', total: '$93.20', status: 'Paid' },
  { number: '#1040', customer: 'Emma Novak', total: '$55.00', status: 'Paid' },
  { number: '#1039', customer: 'Daniel Park', total: '$71.35', status: 'Unpaid' },
  { number: '#1038', customer: 'Maya Patel', total: '$24.90', status: 'Paid' },
  { number: '#1037', customer: 'Anna Kim', total: '$146.60', status: 'Paid' },
  { number: '#1036', customer: 'Leo Martin', total: '$88.10', status: 'Paid' },
  { number: '#1035', customer: 'Ben Carter', total: '$32.40', status: 'Refunded' },
  { number: '#1034', customer: 'Chen Wei', total: '$59.95', status: 'Paid' },
  { number: '#1033', customer: 'Sofia Rossi', total: '$112.30', status: 'Paid' },
  { number: '#1032', customer: 'Emma Novak', total: '$45.70', status: 'Paid' },
  { number: '#1031', customer: 'Omar Haddad', total: '$76.25', status: 'Paid' },
  { number: '#1030', customer: 'Lucas Silva', total: '$28.60', status: 'Paid' },
  { number: '#1029', customer: 'Daniel Park', total: '$134.90', status: 'Paid' },
  { number: '#1028', customer: 'Anna Kim', total: '$62.00', status: 'Paid' },
  { number: '#1027', customer: 'Leo Martin', total: '$17.45', status: 'Refunded' },
  { number: '#1026', customer: 'Maya Patel', total: '$99.80', status: 'Paid' },
  { number: '#1025', customer: 'Ben Carter', total: '$51.30', status: 'Paid' },
  { number: '#1024', customer: 'Sofia Rossi', total: '$38.75', status: 'Paid' },
];

/** The line under a row's customer: the order's number and status */
export function orderDetail(order: Order) {
  return `${order.number} · ${order.status}`;
}

/** The orders a view shows: all of them, or those of one status */
export function ordersIn(view: OrderView): Order[] {
  return view === 'all' ? ORDERS : ORDERS.filter((order) => order.status.toLowerCase() === view);
}

/** The rows of the New order form, the Disabled example's content */
export const ORDER_FORM = [
  { label: 'Customer', value: 'Anna Kim' },
  { label: 'Items', value: 'None' },
  { label: 'Delivery', value: 'Standard' },
];
