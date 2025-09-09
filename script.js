document.getElementById('formulario').addEventListener('submit', function (e) {
    e.preventDefault();
    const statusMsg = document.querySelector('.mensagem-status');
    statusMsg.style.display = 'block';

    const contactItems = document.querySelectorAll('.contact-item');
    let allValid = true;
    let emails = []; // Adicionamos um array para armazenar os emails

    for (let i = 0; i < contactItems.length; i++) {
        if (i < 2) {
            const item = contactItems[i];
            const email = item.querySelector('input[name="email[]"]');
            const telefone = item.querySelector('input[name="telefone[]"]');
            const departamento = item.querySelector('select[name="departamento[]"]');
            const comunicacoes = item.querySelectorAll('input[name="comunicacoes[]"]:checked');

            // Adiciona o e-mail ao array
            emails.push(email.value.trim()); 

            if (!email.value || !telefone.value || !departamento.value || comunicacoes.length === 0) {
                statusMsg.textContent = 'Por favor, preencha todos os campos obrigatórios dos 2 primeiros contatos.';
                statusMsg.className = 'mensagem-status mensagem-erro';
                allValid = false;
                return;
            }
        }
    }

    // --- NOVA VALIDAÇÃO ADICIONADA AQUI ---
    if (emails.length === 2 && emails[0] !== '' && emails[0] === emails[1]) {
        statusMsg.textContent = 'Os dois primeiros e-mails não podem ser iguais.';
        statusMsg.className = 'mensagem-status mensagem-erro';
        allValid = false;
        return;
    }
    // ----------------------------------------

    if (!allValid) {
        return;
    }

    statusMsg.textContent = 'Enviando...';
    
    const cnpj = document.getElementById('cnpj').value;
    const razaoSocial = document.getElementById('razao').value;
    const faturamento = document.getElementById('faturamento').value;
    const funcionarios = document.getElementById('funcionarios').value;

    const contatos = [];
    document.querySelectorAll('.contact-item').forEach(item => {
        contatos.push({
            email: item.querySelector('input[name="email[]"]').value,
            telefone: item.querySelector('input[name="telefone[]"]').value,
            departamento: item.querySelector('select[name="departamento[]"]').value,
            preferencias: Array.from(item.querySelectorAll('input[name="comunicacoes[]"]:checked')).map(el => el.value)
        });
    });

    const payload = { cnpj, razaoSocial, faturamento, funcionarios, contatos };

    fetch('COLE_AQUI_A_SUA_NOVA_URL', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        statusMsg.textContent = '✔ Dados enviados com sucesso!';
        statusMsg.className = 'mensagem-status mensagem-sucesso';
    })
    .catch(error => {
        statusMsg.textContent = '❌ Ocorreu um erro. Tente novamente.';
        statusMsg.className = 'mensagem-status mensagem-erro';
    });
});
