import { NextResponse } from "next/server";
import {
  buildBackendUrl,
  getBackendErrorMessage,
  parseBackendPayload,
} from "@/app/lib/backend-api";

export async function GET() {
  try {
    const backendResponse = await fetch(buildBackendUrl("/produtos/public"), {
      method: "GET",
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(payload) ?? "Nao foi possivel carregar produtos.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao carregar produtos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authorizationHeader = request.headers.get("authorization") ?? "";

    if (!authorizationHeader.trim()) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const formData = await request.formData();
    const payload = new FormData();

    for (const [key, value] of formData.entries()) {
      payload.append(key, value);
    }

    const backendResponse = await fetch(buildBackendUrl("/produtos"), {
      method: "POST",
      headers: {
        Authorization: authorizationHeader,
      },
      body: payload,
      cache: "no-store",
    });

    const backendPayload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(backendPayload) ?? "Nao foi possivel cadastrar produto.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(backendPayload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao cadastrar produto." }, { status: 500 });
  }
}
