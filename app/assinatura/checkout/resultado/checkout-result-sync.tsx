"use client";

import { useEffect, useState } from "react";
import { TOKEN_STORAGE_KEY, TOKEN_TYPE_STORAGE_KEY } from "@/app/lib/auth-session";
import styles from "./page.module.css";

type CheckoutResultSyncProps = {
  paymentId: string | null;
  preapprovalId: string | null;
};

type ConfirmResponse = {
  message?: string | string[];
};

function resolveErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (!payload || typeof payload !== "object") {
    return fallbackMessage;
  }

  const message = (payload as ConfirmResponse).message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (Array.isArray(message) && message.length > 0 && typeof message[0] === "string") {
    return message[0];
  }

  return fallbackMessage;
}

export default function CheckoutResultSync({ paymentId, preapprovalId }: CheckoutResultSyncProps) {
  const [syncMessage, setSyncMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const confirmStatus = async () => {
      if (!paymentId && !preapprovalId) {
        return;
      }

      const token = localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";
      const tokenType = localStorage.getItem(TOKEN_TYPE_STORAGE_KEY)?.trim() || "Bearer";

      if (!token) {
        if (!cancelled) {
          setSyncMessage("Faca login para atualizar o status da assinatura automaticamente.");
          setHasError(true);
        }
        return;
      }

      try {
        const response = await fetch("/api/pagamentos/mercado-pago/confirmar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `${tokenType} ${token}`,
          },
          body: JSON.stringify({
            paymentId,
            preapprovalId,
          }),
        });

        const payload = (await response.json().catch(() => null)) as unknown;

        if (!response.ok) {
          throw new Error(resolveErrorMessage(payload, "Nao foi possivel sincronizar o pagamento."));
        }

        if (!cancelled) {
          setSyncMessage("Status sincronizado com sucesso no sistema.");
          setHasError(false);
        }
      } catch (error) {
        if (!cancelled) {
          setSyncMessage(
            error instanceof Error && error.message
              ? error.message
              : "Erro inesperado ao sincronizar pagamento.",
          );
          setHasError(true);
        }
      }
    };

    void confirmStatus();

    return () => {
      cancelled = true;
    };
  }, [paymentId, preapprovalId]);

  if (!syncMessage) {
    return null;
  }

  return <small className={hasError ? styles.syncError : styles.syncInfo}>{syncMessage}</small>;
}
