export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role:
    | "super_admin"
    | "event_admin"
    | "campaign_manager"
    | "volunteer"
    | "self";
  avatar?: string;
  isActive: boolean;
  canOverride: boolean;
  allowedEvents: string[];
  allowedCategories: string[];
  createdAt: string;
  lastLogin?: string;
}

export interface Event {
  _id: string;
  name: string;
  eventCode: string;
  description?: string;
  dateStart: string;
  dateEnd: string;
  venue: {
    name: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  bannerImage?: string;
  status: "draft" | "active" | "completed" | "cancelled";
  donorThreshold: number;
  settings: {
    freezeNewIssuances: boolean;
    allowSelfRegistration: boolean;
    lockBahumanaToSuperAdmin: boolean;
    extendedValidityHours: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  stats?: {
    totalPasses: number;
    scannedPasses: number;
    scanRate: number;
  };
}

export interface EntryPoint {
  _id: string;
  eventId: string;
  name: string;
  stationLabel: string;
  description?: string;
  type:
    | "venue_entry"
    | "darshan"
    | "prasadam"
    | "bahumana"
    | "vip_seat"
    | "custom";
  linkedEpId?: string;
  maxCapacity?: number;
  currentCount: number;
  multiEntryAllowed: boolean;
  isPaid: boolean;
  isActive: boolean;
  location?: {
    building?: string;
    floor?: string;
    coordinates?: { lat: number; lng: number };
  };
}

export interface Category {
  _id: string;
  eventId: string;
  name: string;
  catCode: string;
  description?: string;
  color: string;
  icon?: string;
  defaultEntryPoints: EntryPoint[];
  issuerRoleRequired: "super_admin" | "event_admin" | "campaign_manager";
  overrideAllowedBy: "super_admin" | "event_admin" | "none";
  isCustom: boolean;
  isActive: boolean;
}

export interface Holder {
  _id: string;
  eventId: string;
  catId: string;
  name: string;
  phone: string;
  email?: string;
  whatsappNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  holderType: "sponsor" | "donor" | "invitee" | "volunteer" | "paid" | "custom";
  lifetimeDonation: number;
  donorEligibilityStatus?: "qualified" | "review_required" | "not_applicable";
  issuedBy: string;
  issuedAt: string;
  overrideReason?: string;
}

export interface QRPass {
  qrId: string;
  holderId: string;
  eventId: string;
  catId: string;
  entryPoints: string[];
  validFrom: string;
  validUntil: string;
  status: "active" | "used" | "revoked" | "expired";
  paymentId?: string;
  paymentAmount?: number;
  deliveryMethod: "whatsapp" | "email" | "print" | "screen" | "none";
  deliveredAt?: string;
  deliveryStatus: "pending" | "sent" | "delivered" | "failed";
  redemptionHistory: Redemption[];
}

export interface Redemption {
  epId: string;
  scannedAt: string;
  scannedBy: string;
  stationLabel: string;
  result:
    | "granted"
    | "already_used"
    | "not_included"
    | "invalid"
    | "link_required";
}

export interface ScanLog {
  _id: string;
  qrId: string;
  epId: string;
  holderId: string;
  scannedBy: string;
  stationLabel: string;
  scannedAt: string;
  result: string;
  deviceInfo?: any;
}

export interface PaidTier {
  _id: string;
  eventId: string;
  name: string;
  price: number;
  entryPoints: string[];
  razorpayItemId: string;
  is80gEligible: boolean;
  isActive: boolean;
}
