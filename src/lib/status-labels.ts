export function translateAppointmentStatus(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "scheduled":
      return "Agendada";
    case "pending":
      return "Pendente";
    case "confirmed":
      return "Confirmada";
    case "cancelled":
      return "Cancelada";
    case "completed":
      return "Concluída";
    case "no_show":
      return "Falta";
    default:
      return status || "-";
  }
}

export function translateMessageStatus(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "sent":
      return "Enviada";
    case "delivered":
      return "Entregue";
    case "read":
      return "Lida";
    case "queued":
      return "Na fila";
    case "failed":
      return "Falhou";
    default:
      return status || "-";
  }
}

export function translateMessageKind(kind: string | null | undefined) {
  switch ((kind ?? "").toLowerCase()) {
    case "confirmation_request":
      return "Confirmação";
    case "reminder_24h":
      return "Lembrete 24h";
    case "post_care":
      return "Pós-atendimento";
    case "manual":
      return "Manual";
    default:
      return kind || "-";
  }
}

export function translatePatientStatus(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "scheduled":
      return "Agendado";
    case "active":
      return "Ativo";
    case "inactive":
      return "Inativo";
    case "em tratamento":
      return "Em tratamento";
    case "finalizado":
      return "Finalizado";
    default:
      return status || "-";
  }
}
