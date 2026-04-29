import { NextResponse } from "next/server";
import {
  buildBackendUrl,
  getBackendErrorMessage,
  parseBackendPayload,
} from "@/app/lib/backend-api";

type ResetPasswordBody = {
  token?: string;
  senha?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResetPasswordBody;
    const token = body.token?.trim() ?? "";
    const senha = body.senha ?? "";

    if (!token || !senha) {
      return NextResponse.json(
        { message: "Token e nova senha sao obrigatorios." },
        { status: 400 },
      );
    }

    if (senha.trim().length < 8) {
      return NextResponse.json(
        { message: "A nova senha precisa ter pelo menos 8 caracteres." },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(buildBackendUrl("/auth/reset-password"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, senha }),
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message =
        getBackendErrorMessage(payload) ??
        "Nao foi possivel redefinir sua senha.";

      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      { message: "Erro inesperado ao redefinir senha." },
      { status: 500 },
    );
  }
}
