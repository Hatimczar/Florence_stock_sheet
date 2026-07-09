import { NextRequest } from 'next/server';
import { getSessionCustomerId, SESSION_COOKIE_NAME } from './auth';
import { findCustomerById, Customer } from './customers';

export async function getCurrentCustomer(req: NextRequest): Promise<Customer | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const customerId = await getSessionCustomerId(token);
  if (!customerId) return null;
  return findCustomerById(customerId);
}
