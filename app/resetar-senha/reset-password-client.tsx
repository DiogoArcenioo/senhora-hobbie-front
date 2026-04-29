"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import styles from "./page.module.css";

type ResetPayload = {
  message?: string | string[];
};

function resolveMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const message = (payload as ResetPayload).message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (Array.isArray(message)) {
    const firstMessage = message.find((item) => typeof item === "string" && item.trim());

    if (typeof firstMessage === "string") {
      return firstMessage;
    }
  }

  return fallback;
}

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!token) {
      setErrorMessage("Link de reset invalido. Solicite um novo link.");
      return;
    }

    if (password.trim().length < 8) {
      setErrorMessage("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMessage("As senhas informadas nao conferem.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, senha: password }),
      });

      const payload = (await response.json().catch(() => null)) as ResetPayload | null;

      if (!response.ok) {
        throw new Error(resolveMessage(payload, "Nao foi possivel redefinir sua senha."));
      }

      setPassword("");
      setPasswordConfirmation("");
      setSuccessMessage(resolveMessage(payload, "Senha redefinida com sucesso."));
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Erro inesperado ao redefinir senha.";

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className={styles.stateBlock}>
        <p className={styles.kicker}>Link invalido</p>
        <h1>Solicite um novo reset de senha.</h1>
        <p>O link usado nao contem um token valido.</p>
        <Link className="btn btn-primary" href="/">
          Voltar ao inicio
        </Link>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className={styles.stateBlock}>
        <p className={styles.kicker}>Senha atualizada</p>
        <h1>Seu acesso foi recuperado.</h1>
        <p>{successMessage}</p>
        <Link className="btn btn-primary" href="/">
          Voltar ao inicio
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={styles.kicker}>Reset seguro</p>
      <h1>Crie uma nova senha.</h1>

      <label className={styles.field}>
        Nova senha
        <input
          type="password"
          name="password"
          placeholder="Minimo de 8 caracteres"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          required
          minLength={8}
        />
      </label>

      <label className={styles.field}>
        Confirmar senha
        <input
          type="password"
          name="password-confirmation"
          placeholder="Digite a nova senha novamente"
          autoComplete="new-password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          disabled={isSubmitting}
          required
          minLength={8}
        />
      </label>

      {errorMessage ? (
        <p className={styles.feedbackError} role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button className={styles.submit} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Redefinir senha"}
      </button>
    </form>
  );
}
