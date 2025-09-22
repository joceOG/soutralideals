import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, IconButton,
  Avatar, List, ListItem, ListItemAvatar, ListItemText,
  Divider, Badge, InputAdornment, Card, CardContent
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SearchIcon from '@mui/icons-material/Search';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ INTERFACES TYPESCRIPT
interface IUtilisateur {
  _id: string;
  nom: string;
  prenom: string;
  photoProfil?: string;
}

interface IMessage {
  _id: string;
  expediteur: IUtilisateur;
  destinataire: IUtilisateur;
  contenu: string;
  pieceJointe?: string;
  typePieceJointe?: string;
  typeMessage: string;
  statut: string;
  conversationId: string;
  createdAt: string;
}

interface IConversation {
  _id: string;
  dernierMessage: IMessage;
  nombreNonLus: number;
  expediteurInfo: IUtilisateur[];
  destinataireInfo: IUtilisateur[];
}

interface IMessageStats {
  totalMessages: number;
  messagesParJour: Array<{
    _id: string;
    count: number;
  }>;
}

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const MessagesComponent: React.FC = () => {
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<IMessageStats | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // ID utilisateur actuel (à récupérer depuis le contexte d'auth)
  const currentUserId = '507f1f77bcf86cd799439011'; // Exemple - à remplacer

  // 🔹 CHARGEMENT DES CONVERSATIONS
  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${apiUrl}/messages/conversations/${currentUserId}`);
      setConversations(response.data.conversations || []);
    } catch (error) {
      toast.error("Erreur lors du chargement des conversations");
      console.error(error);
    }
  };

  // 🔹 CHARGEMENT DES MESSAGES D'UNE CONVERSATION
  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await axios.get(
        `${apiUrl}/messages/conversation/${conversationId}?userId=${currentUserId}`
      );
      setMessages(response.data.messages || []);
      
      // Marquer comme lus
      await axios.patch(`${apiUrl}/messages/mark-read`, {
        conversationId,
        userId: currentUserId
      });
    } catch (error) {
      toast.error("Erreur lors du chargement des messages");
      console.error(error);
    }
  };

  // 🔹 CHARGEMENT DES STATISTIQUES
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${apiUrl}/messages/stats?userId=${currentUserId}`);
      setStats(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchStats();
    setLoading(false);
  }, []);

  // 🔹 SÉLECTION D'UNE CONVERSATION
  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    fetchMessages(conversationId);
  };

  // 🔹 ENVOI D'UN MESSAGE
  const handleSendMessage = async () => {
    if (!newMessage.trim() && !file) return;
    if (!selectedConversation) return;

    try {
      const formData = new FormData();
      
      // Déterminer le destinataire depuis la conversation sélectionnée
      const conversation = conversations.find(c => c._id === selectedConversation);
      if (!conversation) return;

      const destinataire = conversation.dernierMessage.expediteur._id === currentUserId 
        ? conversation.dernierMessage.destinataire._id 
        : conversation.dernierMessage.expediteur._id;

      formData.append('expediteur', currentUserId);
      formData.append('destinataire', destinataire);
      formData.append('contenu', newMessage);
      
      if (file) {
        formData.append('pieceJointe', file);
      }

      await axios.post(`${apiUrl}/message`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setNewMessage('');
      setFile(null);
      fetchMessages(selectedConversation);
      fetchConversations();
    } catch (error) {
      toast.error("Erreur lors de l'envoi du message");
      console.error(error);
    }
  };

  // 🔹 FILTRAGE DES CONVERSATIONS
  const filteredConversations = conversations.filter(conv => {
    const otherUser = conv.dernierMessage.expediteur._id === currentUserId 
      ? conv.dernierMessage.destinataire 
      : conv.dernierMessage.expediteur;
    
    return `${otherUser.nom} ${otherUser.prenom}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

  // 🔹 FORMATAGE DES DATES
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 3600);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 jours
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <Box m={2}>
      <ToastContainer />
      
      {/* 📊 HEADER AVEC STATISTIQUES */}
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Messages & Conversations
        </Typography>
        
        {stats && (
          <Box display="flex" gap={2} mb={2}>
            <Card sx={{ minWidth: 150 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" color="primary">
                  {stats.totalMessages}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total Messages
                </Typography>
              </CardContent>
            </Card>
            
            <Card sx={{ minWidth: 150 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" color="secondary">
                  {conversations.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Conversations
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>

      {/* 💬 INTERFACE DE CHAT */}
      <Box display="flex" height="70vh" gap={2}>
        
        {/* 📝 PANNEAU DES CONVERSATIONS */}
        <Paper sx={{ width: '30%', display: 'flex', flexDirection: 'column' }}>
          {/* Recherche */}
          <Box p={2}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Rechercher une conversation..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          
          <Divider />
          
          {/* Liste des conversations */}
          <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
            {filteredConversations.map((conversation) => {
              const otherUser = conversation.dernierMessage.expediteur._id === currentUserId 
                ? conversation.dernierMessage.destinataire 
                : conversation.dernierMessage.expediteur;
              
              return (
                <React.Fragment key={conversation._id}>
                  <ListItem
                    button
                    selected={selectedConversation === conversation._id}
                    onClick={() => handleSelectConversation(conversation._id)}
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: 'primary.light',
                        color: 'primary.contrastText'
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Badge badgeContent={conversation.nombreNonLus} color="error">
                        <Avatar src={otherUser.photoProfil}>
                          {otherUser.nom.charAt(0)}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${otherUser.nom} ${otherUser.prenom}`}
                      secondary={
                        <Box>
                          <Typography 
                            variant="body2" 
                            noWrap 
                            sx={{ maxWidth: 200 }}
                          >
                            {conversation.dernierMessage.contenu}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {formatTime(conversation.dernierMessage.createdAt)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              );
            })}
          </List>
        </Paper>

        {/* 💬 PANNEAU DES MESSAGES */}
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              {/* Header de conversation */}
              <Box 
                p={2} 
                borderBottom={1} 
                borderColor="divider"
                display="flex" 
                alignItems="center" 
                justifyContent="space-between"
              >
                <Typography variant="h6">
                  {(() => {
                    const conversation = conversations.find(c => c._id === selectedConversation);
                    if (!conversation) return '';
                    const otherUser = conversation.dernierMessage.expediteur._id === currentUserId 
                      ? conversation.dernierMessage.destinataire 
                      : conversation.dernierMessage.expediteur;
                    return `${otherUser.nom} ${otherUser.prenom}`;
                  })()}
                </Typography>
                <IconButton>
                  <MoreVertIcon />
                </IconButton>
              </Box>

              {/* Zone des messages */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                {messages.map((message) => (
                  <Box
                    key={message._id}
                    display="flex"
                    justifyContent={message.expediteur._id === currentUserId ? 'flex-end' : 'flex-start'}
                    mb={1}
                  >
                    <Paper
                      sx={{
                        maxWidth: '70%',
                        p: 1.5,
                        backgroundColor: message.expediteur._id === currentUserId 
                          ? 'primary.main' 
                          : 'grey.100',
                        color: message.expediteur._id === currentUserId 
                          ? 'primary.contrastText' 
                          : 'text.primary'
                      }}
                    >
                      <Typography variant="body2">
                        {message.contenu}
                      </Typography>
                      {message.pieceJointe && (
                        <Box mt={1}>
                          {message.typePieceJointe === 'IMAGE' ? (
                            <img 
                              src={message.pieceJointe} 
                              alt="Pièce jointe" 
                              style={{ maxWidth: 200, borderRadius: 8 }}
                            />
                          ) : (
                            <Typography variant="caption">
                              📎 Pièce jointe
                            </Typography>
                          )}
                        </Box>
                      )}
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        {formatTime(message.createdAt)}
                      </Typography>
                    </Paper>
                  </Box>
                ))}
              </Box>

              {/* Zone de saisie */}
              <Box p={2} borderTop={1} borderColor="divider">
                <Box display="flex" alignItems="center" gap={1}>
                  <input
                    type="file"
                    id="file-input"
                    style={{ display: 'none' }}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="file-input">
                    <IconButton component="span">
                      <AttachFileIcon />
                    </IconButton>
                  </label>
                  
                  <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="Tapez votre message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    multiline
                    maxRows={3}
                  />
                  
                  <IconButton 
                    color="primary" 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() && !file}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
                
                {file && (
                  <Box mt={1}>
                    <Typography variant="caption" color="primary">
                      📎 {file.name}
                    </Typography>
                    <IconButton size="small" onClick={() => setFile(null)}>
                      ❌
                    </IconButton>
                  </Box>
                )}
              </Box>
            </>
          ) : (
            <Box 
              display="flex" 
              alignItems="center" 
              justifyContent="center" 
              height="100%"
              color="text.secondary"
            >
              <Typography variant="h6">
                Sélectionnez une conversation pour commencer
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default MessagesComponent;

