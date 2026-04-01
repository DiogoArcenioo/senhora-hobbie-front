import { NextResponse } from "next/server";
import {
  buildBackendUrl,
  getBackendErrorMessage,
  parseBackendPayload,
} from "@/app/lib/backend-api";

type LoginBody = {
  email?: string;
  senha?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const email = body.email?.trim() ?? "";
    const senha = body.senha ?? "";

    if (!email || !senha) {
      return NextResponse.json(
        { message: "E-mail e senha são obrigatórios." },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(buildBackendUrl("/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, senha }),
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message =
        getBackendErrorMessage(payload) ?? "Não foi possível realizar o login.";

      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      { message: "Erro inesperado ao tentar fazer login." },
      { status: 500 },
    );
  }
}
