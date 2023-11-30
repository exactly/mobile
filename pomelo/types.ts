type Country = "ARG" | "BRA" | "MEX" | "COL" | "PER" | "CHL";

type DateString = `${number}-${number}-${number}`;

type Address = {
  street_name: string;
  street_number: number;
  floor: number;
  apartment: string;
  zip_code: number;
  neighborhood: string;
  city: string;
  region: string;
  additional_info: string;
  country: Country;
};

type CurrencyAmount = {
  total: string;
  currency: string;
};

export type Paginated<T extends Record<string, unknown>> = {
  data: T[];
  meta: {
    pagination: {
      total_pages: number;
      current: number;
    };
    filter: {
      key: keyof T;
      value: T[keyof T][];
    }[];
  };
};

export type AccessTokenResponse = {
  access_token: string;
  scope: string;
  expires_in: number;
  token_type: "Bearer";
};

export type ErrorPayload = {
  error: {
    error_code: string;
    details: {
      code: string;
      detail: string;
    }[];
  };
};

export type User = {
  id: `usr-${string}`;
  client_id: `cli-${string}`;
  email: `${string}@${string}.${string}`;
  status: "ACTIVE" | "BLOCKED";
  operation_country: Country;
  name?: string;
  surname?: string;
  identification_type?: "DNI" | "LE" | "LC" | "CI" | "PASSPORT" | "RG" | "CNH" | "INE" | "CC" | "CE" | "PPT";
  identification_value?: string;
  birthdate?: DateString;
  gender?: string;
  phone: number;
  tax_identification_type?: "CUIL" | "CUIT" | "CDI" | "CPF" | "RUT" | "RUC" | "RFC" | "NIT";
  tax_identification_value?: string;
  nationality: Country;
  legal_address?: Address;
};

export type CreateUserRequest = Omit<User, "id" | "client_id" | "status">;

export type Card = {
  id: `crd-${string}`;
  user_id: User["id"];
  affinity_group_id: `afg-${string}`;
  card_type: "VIRTUAL" | "PHYSICAL";
  product_type?: "PREPAID" | "DEBIT" | "CREDIT";
  status?: "ACTIVE" | "BLOCKED" | "DISABLED";
  shipment_id?: `shi-${string}`;
  start_date?: DateString;
  last_four?: string;
  provider?: "MASTERCARD" | "VISA";
  affinity_group_name?: string;
};

export type CreateCardRequest = Pick<Card, "user_id" | "affinity_group_id" | "card_type"> & {
  address?: Address;
  previous_card_id?: Card["id"];
};

export type AuthorizationRequest = {
  transaction: {
    id: `ctx-${string}`;
    type: string;
    point_type: string;
    entry_mode: string;
    country_code: string;
    origin: string;
    source: string;
    original_transaction_id: `ctx-${string}`;
    local_date_time: `${DateString}T${number}:${number}:${number}`;
  };
  merchant: {
    id: string;
    mcc: string;
    address: string;
    name: string;
  };
  card: Pick<Card, "id" | "product_type" | "provider" | "last_four">;
  user: Pick<User, "id">;
  amount: {
    local: CurrencyAmount;
    settlement: CurrencyAmount;
    transaction: CurrencyAmount;
    details: {
      type: string;
      currency: string;
      amount: string;
      name: string;
    }[];
  };
};
