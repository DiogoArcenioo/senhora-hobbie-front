import { NextResponse } from "next/server";
import { buildBackendUrl, getBackendErrorMessage, parseBackendPayload } from "@/app/lib/backend-api";

type ConfirmBody = {
  paymentId?: string;
  preapprovalId?: string;
};

export async function POST(request: Request) {
  try {
    const authorizationHeader = request.headers.get("authorization") ?? "";

    if (!authorizationHeader.trim()) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const body = (await request.json()) as ConfirmBody;
    const paymentId = body.paymentId?.trim() ?? "";
    const preapprovalId = body.preapprovalId?.trim() ?? "";

    if (!paymentId && !preapprovalId) {
      return NextResponse.json({ message: "paymentId ou preapprovalId e obrigatorio." }, { status: 400 });
    }

    const backendResponse = await fetch(buildBackendUrl("/pagamentos/mercado-pago/confirmar"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorizationHeader,
      },
      body: JSON.stringify({ paymentId, preapprovalId }),
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(payload) ?? "Nao foi possivel confirmar pagamento.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao confirmar pagamento." }, { status: 500 });
  }
}
