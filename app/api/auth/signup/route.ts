import { NextResponse } from "next/server";
import {
  buildBackendUrl,
  getBackendErrorMessage,
  parseBackendPayload,
} from "@/app/lib/backend-api";

type SignupEnderecoBody = {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
};

type SignupBody = {
  nome?: string;
  email?: string;
  senha_hash?: string;
  endereco?: SignupEnderecoBody;
};

function isNonEmpty(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupBody;
    const nome = body.nome?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const senhaHash = body.senha_hash ?? "";
    const endereco = body.endereco ?? {};

    const logradouro = endereco.logradouro?.trim() ?? "";
    const numero = endereco.numero?.trim() ?? "";
    const complemento = endereco.complemento?.trim() ?? "";
    const bairro = endereco.bairro?.trim() ?? "";
    const cidade = endereco.cidade?.trim() ?? "";
    const estado = endereco.estado?.trim() ?? "";
    const cep = endereco.cep?.trim() ?? "";

    if (
      !nome ||
      !email ||
      !senhaHash ||
      !logradouro ||
      !numero ||
      !bairro ||
      !cidade ||
      !estado ||
      !cep
    ) {
      return NextResponse.json(
        { message: "Nome, e-mail, senha e endereco completo sao obrigatorios." },
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
        endereco: {
          logradouro,
          numero,
          complemento: isNonEmpty(complemento) ? complemento : null,
          bairro,
          cidade,
          estado,
          cep,
        },
      }),
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message =
        getBackendErrorMessage(payload) ?? "Nao foi possivel concluir o cadastro.";

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
