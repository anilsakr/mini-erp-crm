import { CustomerStatus, CustomerType } from '@prisma/client';
import { customerRepository } from '../repositories/customer.repository';
import { AppError } from '../utils/AppError';
import { buildPaginationMeta } from '../utils/pagination';

interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: CustomerStatus;
  customerType?: CustomerType;
}

interface CreateCustomerInput {
  name: string;
  mobile: string;
  email?: string;
  businessName: string;
  gstNumber?: string;
  customerType: CustomerType;
  address: string;
  status?: CustomerStatus;
  followUpDate?: Date;
  notes?: string;
}

export const customerService = {
  async list(params: ListParams) {
    const { items, total } = await customerRepository.findMany(params);
    return { items, pagination: buildPaginationMeta(params.page, params.pageSize, total) };
  },

  async getById(id: string) {
    const customer = await customerRepository.findById(id);
    if (!customer) throw AppError.notFound('Customer');
    return customer;
  },

  create(input: CreateCustomerInput, createdById: string) {
    return customerRepository.create({
      name: input.name,
      mobile: input.mobile,
      email: input.email || null,
      businessName: input.businessName,
      gstNumber: input.gstNumber || null,
      customerType: input.customerType,
      address: input.address,
      status: input.status ?? CustomerStatus.LEAD,
      followUpDate: input.followUpDate ?? null,
      notes: input.notes ?? null,
      createdBy: { connect: { id: createdById } },
    });
  },

  async update(id: string, input: Partial<CreateCustomerInput>) {
    await this.getById(id);
    return customerRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.mobile !== undefined ? { mobile: input.mobile } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.businessName !== undefined ? { businessName: input.businessName } : {}),
      ...(input.gstNumber !== undefined ? { gstNumber: input.gstNumber || null } : {}),
      ...(input.customerType !== undefined ? { customerType: input.customerType } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.followUpDate !== undefined ? { followUpDate: input.followUpDate } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });
  },

  async addFollowUp(customerId: string, note: string, followUpDate: Date | undefined, createdById: string) {
    await this.getById(customerId);
    return customerRepository.addFollowUp({
      customer: { connect: { id: customerId } },
      note,
      followUpDate: followUpDate ?? null,
      createdBy: { connect: { id: createdById } },
    });
  },

  async getStats() {
    const [total, active] = await Promise.all([
      customerRepository.count(),
      customerRepository.countByStatus(CustomerStatus.ACTIVE),
    ]);
    return { total, active };
  },
};
