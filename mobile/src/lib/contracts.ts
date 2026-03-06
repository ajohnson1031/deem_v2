export type Money = {
  cents: number;
  currency: string;
};

export type WalletDto = {
  id: string;
  xrpDrops?: number;
  xrp?: number | string;
};

export type BalanceResponse = {
  wallet?: WalletDto;
};

export type GiftCardDto = {
  id: string;
  brand?: string | null;
  last4?: string | null;
  balanceUsd?: number;
  balanceCents?: number;
};

export type GiftCardCreateResponse = {
  giftCard: GiftCardDto;
};

export type GiftCardBalanceResponse = {
  giftCard?: GiftCardDto;
  balance?: {
    cents?: number;
    currency?: string;
  };
  balanceCents?: number;
  balanceUsd?: number;
  ui?: {
    subtitle?: string;
  };
};

export type QuoteDto = {
  id: string;
  inputCents?: number;
  outputXrp?: number;
};

export type QuoteUiDto = {
  subtitle?: string;
  feeLabel?: string;
  rateLabel?: string;
  totalLabel?: string;
};

export type QuoteResponse = {
  quote: QuoteDto;
  ui?: QuoteUiDto;
};

export type CreateConversionResponse = {
  conversion: {
    id: string;
  };
};

export type BankAccountDto = {
  id: string;
  displayLabel?: string;
  masked?: string;
};

export type BankAccountsResponse =
  | {
      accounts: BankAccountDto[];
    }
  | BankAccountDto[];

export type LinkStartResponse = {
  linkToken: string;
};

export type LinkCompleteResponse = {
  bankAccount: BankAccountDto;
  displayLabel?: string;
  masked?: string;
};

export type ActivityItem = {
  id?: string;
  conversionId?: string;
  type?: string;
  status?: string;
  displayStatus?: string;
  displaySubtitle?: string;
  processingPercent?: number | null;
  requiresBank?: boolean;
  isTerminal?: boolean;
  failureReason?: string | null;

  createdAt?: string;
  updatedAt?: string;

  sourceAmount?: { cents?: number; currency?: string };
  netAmount?: { cents?: number; currency?: string };
  fees?: { cents?: number; currency?: string };

  amount?: { cents?: number; currency?: string };
  xrpAmount?: number | null;

  title?: string;
  subtitle?: string;
};

export type ActivityResponse = {
  items?: ActivityItem[];
  nextCursor?: string | null;
};

export type ConversionTimelineItem = {
  id?: string;
  type?: string;
  at?: string;
  kind?: string;
  to?: string | null;
  step?: string | null;
  title?: string | null;
  message?: string | null;
  reason?: string | null;
  displayLabel?: string | null;
  bankLabel?: string | null;
  masked?: string | null;
  provider?: string | null;
  op?: string | null;
  result?: string | null;
  providerRef?: string | null;
  error?: string | null;
  action?: string | null;
  amountCents?: number | null;
  details?: any;
  payload?: any;
  [key: string]: any;
};

export type ConversionDto = {
  id: string;
  status: string;

  displayStatus: string;
  displaySubtitle?: string | null;
  processingPercent?: number | null;
  requiresBank?: boolean;
  isTerminal?: boolean;

  createdAt?: string;
  updatedAt?: string;

  sourceAmount?: Money;
  fees?: Money;
  netAmount?: Money;

  xrpAmount?: number | null;
  failureReason?: string | null;
};

export type ConversionTimelineResponse = {
  conversion: ConversionDto;
  timeline: ConversionTimelineItem[];
};
