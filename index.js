// chatbot-dentista/index.js
const venom = require('venom-bot');
const fs = require('fs');

let agendamentos = loadAgendamentos();

venom.create().then((client) => start(client)).catch((error) => console.log(error));

function start(client) {
  setInterval(() => confirmarConsultas(client), 1000 * 60 * 60 * 24); // Verifica diariamente

  client.onMessage(async (message) => {
    if (message.isGroupMsg) return;

    const from = message.from;
    let session = getSession(from);

    if (!session.step) {
      session.step = 'inicio';
      sendWelcome(client, from);
      return;
    }

    handleSteps(client, message, session);
  });
}

// Sessões de usuários
let sessions = {};
function getSession(user) {
  if (!sessions[user]) sessions[user] = {};
  return sessions[user];
}

function sendWelcome(client, from) {
  client.sendText(from, `Olá! seja bem-vindo(a) ao canal de atendimento do Dr Arthur Martorelli, será um prazer ter você como nosso paciente.\nNeste canal você poderá realizar agendamento de consultas, exames e tirar dúvidas sobre os procedimentos.`)
    .then(() => {
      client.sendText(from, `Digite o número do assunto que deseja ser atendido(a)?\n1-Agendar consulta\n2-Implante dentário\n3-Prótese dentária\n4-Clareamento\n5-Agendar Retorno\n6-Resultado de exames\n7-Endereço do consultório\n8-Outras informações`);
    });
}

function handleSteps(client, message, session) {
  const text = message.body.trim();

  switch (session.step) {
    case 'inicio':
      if (["1","2","3","4"].includes(text)) {
        session.opcao = text;
        session.step = 'paciente_existente';
        client.sendText(message.from, 'Você já é nosso paciente?\n1 - Sim, já sou paciente\n2 - Ainda não');
      } else if (["5","6","8"].includes(text)) {
        session.step = 'fim';
        client.sendText(message.from, 'Certo, o Dr. Arthur Martorelli te responderá em breve.');
      } else if (text === '7') {
        session.step = 'fim';
        client.sendText(message.from, `Endereço do consultório:\nRua José Aderval Chaves,296\nBoa Viagem\nConsultório 205\nLocalizado próximo de Paulo Miranda`);
      } else {
        client.sendText(message.from, 'Opção inválida. Por favor, escolha uma das opções da lista.');
      }
      break;

    case 'paciente_existente':
      if (text === '1') {
        session.step = session.opcao === '1' ? 'selecionar_tratamento' : 'selecionar_data';
        if (session.step === 'selecionar_tratamento') {
          sendTratamentos(client, message.from);
        } else {
          client.sendText(message.from, 'Solicite a data que você deseja:\n1- 08/04/2025\n2- 09/04/2025\n3- 10/04/2025');
        }
      } else if (text === '2') {
        session.step = 'coletar_nome';
        client.sendText(message.from, 'Poderia informar seu nome completo, por gentileza?');
      } else {
        client.sendText(message.from, 'Digite 1 para "Sim, já sou paciente" ou 2 para "Ainda não".');
      }
      break;

    case 'coletar_nome':
      session.nome = text;
      session.step = 'coletar_telefone';
      client.sendText(message.from, 'Por gentileza, digite seu número de celular');
      break;

    case 'coletar_telefone':
      session.telefone = text;
      session.step = session.opcao === '1' ? 'selecionar_tratamento' : 'selecionar_data';
      if (session.step === 'selecionar_tratamento') {
        sendTratamentos(client, message.from);
      } else {
        client.sendText(message.from, 'Solicite a data que você deseja:\n1- 08/04/2025\n2- 09/04/2025\n3- 10/04/2025');
      }
      break;

    case 'selecionar_tratamento':
      session.tratamento = text;
      session.step = 'selecionar_data';
      client.sendText(message.from, 'Solicite a data que você deseja:\n1- 08/04/2025\n2- 09/04/2025\n3- 10/04/2025');
      break;

    case 'selecionar_data':
      const datas = ['08/04/2025', '09/04/2025', '10/04/2025'];
      session.data = datas[parseInt(text) - 1];
      session.step = 'selecionar_horario';
      client.sendText(message.from, 'Selecione a hora que deseja:\n1- 09:00\n2- 13:00\n3- 16:00');
      break;

    case 'selecionar_horario':
      const horarios = ['09:00', '13:00', '16:00'];
      const horario = horarios[parseInt(text) - 1];
      const agendamentoExistente = agendamentos.find(a => a.data === session.data && a.hora === horario);

      if (agendamentoExistente) {
        client.sendText(message.from, 'Esse horário já está reservado. Por favor, escolha outro.');
        return;
      }

      session.hora = horario;
      const novoAgendamento = {
        nome: session.nome || 'Paciente',
        telefone: session.telefone || '---',
        data: session.data,
        hora: horario,
        from: message.from
      };
      agendamentos.push(novoAgendamento);
      saveAgendamentos();
      session.step = 'fim';

      client.sendText(message.from, `Agendamento realizado com sucesso\n\nEndereço do consultório:\nRua José Aderval Chaves,296\nBoa Viagem\nConsultório 205\nLocalizado próximo de Paulo Miranda`);
      break;

    case 'confirmar_consulta':
      if (text === '1') {
        client.sendText(message.from, 'Ok, consulta confirmada com sucesso!');
        session.step = 'fim';
      } else if (text === '2') {
        session.step = 'selecionar_data';
        client.sendText(message.from, 'Solicite a data que você deseja:\n1- 08/04/2025\n2- 09/04/2025\n3- 10/04/2025');
      } else {
        client.sendText(message.from, 'Digite 1 para confirmar ou 2 para reagendar.');
      }
      break;
  }
}

function sendTratamentos(client, from) {
  client.sendText(from, `Selecione o tratamento:\n1-Implante\n2-Prótese\n3-Clareamento\n4-Limpeza\n5-Restauração\n6-Extração\n7-Botox\n8-Faceta\n9-Outros`);
}

function confirmarConsultas(client) {
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);
  const dia = amanha.toLocaleDateString('pt-BR');

  agendamentos.forEach((ag) => {
    if (ag.data === dia) {
      const nome = ag.nome;
      const msg = `Olá! Estamos entrando em contato para confirmar sua consulta\nPaciente: ${nome}\nDentista: Dr. Arthur Martorelli\nData: ${ag.data}\nHorário: ${ag.hora}`;
      client.sendText(ag.from, msg).then(() => {
        client.sendText(ag.from, '1 - Confirmar\n2 - Reagendar');
        getSession(ag.from).step = 'confirmar_consulta';
      });
    }
  });
}

function saveAgendamentos() {
  fs.writeFileSync('agendamentos.json', JSON.stringify(agendamentos, null, 2));
}

function loadAgendamentos() {
  try {
    return JSON.parse(fs.readFileSync('agendamentos.json'));
  } catch {
    return [];
  }
}
