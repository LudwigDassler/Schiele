import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = "https://kefdjxsmyarwfqqkfgcx.supabase.co"; 
const SUPABASE_KEY = "sb_secret_2UZY3PLCKoIznRnZoCoPDg_wsv6lYp7"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase().trim() || "";

  try {
    // 1. ����� ��� ���� �� ����
    const { data: pins, error } = await supabase.from("pins").select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // ���� ������ ������ � ������ ������ 30 ����� ��� ������� ��������
    if (!query) {
      return NextResponse.json({ pins: pins.slice(0, 30) });
    }

    // 2. ������� ����������: ���� ������ �� ����, ��� ������� ���� ��� �����
    const filteredPins = pins.filter((pin: any) => {
      const brand = (pin.brand || "").toLowerCase();
      const category = (pin.category || "").toLowerCase();
      const description = (pin.description || "").toLowerCase();
      const title = (pin.title || "").toLowerCase();

      // ���������, ������ �� ��������� ������ ���� � ���� ����
      return (
        brand.includes(query) ||
        category.includes(query) ||
        description.includes(query) ||
        title.includes(query)
      );
    });

    return NextResponse.json({ pins: filteredPins });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
