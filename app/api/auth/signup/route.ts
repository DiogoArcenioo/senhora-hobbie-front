import { NextResponse } from "next/server";
import {
  buildBackendUrl,
  getBackendErrorMessage,
  parseBackendPayload,
} from "@/app/lib/backend-api";

type SignupBody = {
  nome?: string;
  email?: string;
  senha_hash?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupBody;
    const nome = body.nome?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const senhaHash = body.senha_hash ?? "";

    if (!nome || !email || !senhaHash) {
      return NextResponse.json(
        { message: "Nome, e-mail e senha são obrigatórios." },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(buildBackendUrl("/usuarios"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome,
        email,
        senha_hash: senhaHash,
      }),
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message =
        getBackendErrorMessage(payload) ?? "Não foi possível concluir o cadastro.";

      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      { message: "Erro inesperado ao tentar cadastrar." },
      { status: 500 },
    );
  }
}
