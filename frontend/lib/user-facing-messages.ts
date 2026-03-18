import { ApiError } from "@/api/client";

export type NoticeTone = "info" | "warning";

export type UserFacingNotice = {
  badge: string;
  title: string;
  description: string;
  tone: NoticeTone;
  actionLabel?: string;
  actionHref?: string;
};

function normalizeMessage(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractErrorMeta(input: unknown) {
  if (input instanceof ApiError) {
    return {
      status: input.status,
      message: normalizeMessage(input.message),
    };
  }

  if (input instanceof Error) {
    return {
      status: undefined,
      message: normalizeMessage(input.message),
    };
  }

  if (typeof input === "string") {
    return {
      status: undefined,
      message: normalizeMessage(input),
    };
  }

  if (input && typeof input === "object" && "message" in input && typeof input.message === "string") {
    return {
      status: undefined,
      message: normalizeMessage(input.message),
    };
  }

  return {
    status: undefined,
    message: "",
  };
}

export function resolveUserFacingNotice(input: unknown, fallback?: {
  title?: string;
  description?: string;
}): UserFacingNotice {
  const { status, message } = extractErrorMeta(input);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("daily limit exceeded") ||
    normalized.includes("free users can attempt 3 tests per day")
  ) {
    return {
      badge: "Tarif cheklovi",
      title: "Bugungi bepul urinishlar tugadi",
      description:
        "Bugun bepul foydalanuvchi uchun ajratilgan 3 ta sinov ishlatildi. Ertaga davom etishingiz yoki Premium tarifga o'tib cheklovsiz davom etishingiz mumkin.",
      tone: "warning",
      actionLabel: "Premium tarifni ko'rish",
      actionHref: "/settings",
    };
  }

  if (
    status === 403 ||
    normalized.includes("premium required") ||
    normalized.includes("upgrade to premium") ||
    normalized.includes("forbidden")
  ) {
    return {
      badge: "Tarif tavsiyasi",
      title: "Bu imkoniyat hozircha yopiq",
      description:
        "Mazkur funksiya sizning joriy tarifingizda to'liq ochilmagan. Premium tarifga o'tsangiz, cheklovsiz foydalanish imkoniyati paydo bo'ladi.",
      tone: "warning",
      actionLabel: "Tarif tafsiloti",
      actionHref: "/settings",
    };
  }

  if (status === 401 || normalized.includes("unauthorized")) {
    return {
      badge: "Sessiya",
      title: "Sessiya holatini yangilash kerak",
      description:
        "Hisobingiz xavfsizligi uchun sessiya muddati tugagan bo'lishi mumkin. Qayta kirib, davom etishingiz mumkin.",
      tone: "info",
      actionLabel: "Qayta kirish",
      actionHref: "/login",
    };
  }

  if (status === 404 || normalized.includes("not found")) {
    return {
      badge: "Ma'lumot",
      title: "Kerakli ma'lumot topilmadi",
      description:
        "Bu bo'lim uchun kerakli ma'lumot hozircha mavjud emas yoki vaqtincha ko'rsatilmayapti. Sahifani yangilab qayta urinib ko'ring.",
      tone: "info",
    };
  }

  if (
    normalized.includes("network request failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network error")
  ) {
    return {
      badge: "Ulanish",
      title: "Internet aloqasini tekshirib ko'ring",
      description:
        "Server bilan bog'lanishda uzilish yuz berdi. Internet ulanishini tekshirib, bir necha soniyadan so'ng qayta urinib ko'ring.",
      tone: "info",
    };
  }

  if (normalized.includes("attempt already finished")) {
    return {
      badge: "Urinish holati",
      title: "Bu urinish allaqachon yakunlangan",
      description:
        "Natija saqlanib bo'ldi. Natijani ko'rib chiqishingiz yoki yangi sinov boshlashingiz mumkin.",
      tone: "info",
    };
  }

  if (normalized.includes("attempt not found")) {
    return {
      badge: "Sinov holati",
      title: "Boshlangan sinov topilmadi",
      description:
        "Sinov sessiyasi topilmadi yoki muddati tugagan. Sahifani yangilab, sinovni qayta boshlang.",
      tone: "info",
    };
  }

  if (normalized.includes("incorrect email or password")) {
    return {
      badge: "Kirish",
      title: "Email yoki parol mos kelmadi",
      description:
        "Kiritilgan ma'lumotlarni tekshirib, qaytadan urinib ko'ring. Harflar registriga ham e'tibor bering.",
      tone: "info",
    };
  }

  if (normalized.includes("email not verified")) {
    return {
      badge: "Tasdiqlash",
      title: "Email hali tasdiqlanmagan",
      description:
        "Akkountni to'liq ishga tushirish uchun emailingizga yuborilgan tasdiqlash kodini kiriting.",
      tone: "info",
      actionLabel: "Tasdiqlash sahifasi",
      actionHref: "/verify",
    };
  }

  return {
    badge: "Ma'lumot",
    title: fallback?.title ?? "Holat haqida qisqa eslatma",
    description:
      fallback?.description ||
      message ||
      "Hozircha ma'lumotni ko'rsatishda kichik uzilish bor. Bir ozdan so'ng qayta urinib ko'rishingiz mumkin.",
    tone: "info",
  };
}
