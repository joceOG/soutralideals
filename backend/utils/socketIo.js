/** Instance Socket.IO partagée (HTTP → temps réel). */
let _io = null;

export function setSocketIo(io) {
  _io = io;
}

export function getSocketIo() {
  return _io;
}

/** Diffuse un message déjà persisté via l'API HTTP. */
export function emitNewMessage(populatedMessage) {
  if (!_io || !populatedMessage) return;
  const msg = typeof populatedMessage.toObject === 'function'
    ? populatedMessage.toObject()
    : populatedMessage;

  const conversationId = msg.conversationId;
  const destinataireId =
    msg.destinataire?._id?.toString?.() ||
    msg.destinataire?.toString?.() ||
    msg.destinataire;
  const expediteurId =
    msg.expediteur?._id?.toString?.() ||
    msg.expediteur?.toString?.() ||
    msg.expediteur;

  if (conversationId) {
    _io.to(`conversation_${conversationId}`).emit('new-message', {
      ...msg,
      timestamp: msg.createdAt || new Date(),
    });
  }
  if (destinataireId) {
    _io.to(`user_${destinataireId}`).emit('message-notification', {
      type: 'new_message',
      conversationId,
      sender: expediteurId,
      content: msg.contenu,
    });
  }
}
