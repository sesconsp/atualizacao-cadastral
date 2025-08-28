document.getElementById('formulario').addEventListener('submit', function (e) {
    e.preventDefault();
    const statusMsg = document.querySelector('.mensagem-status');
    statusMsg.style.display = 'block';

    const contactItems = document.querySelectorAll('.contact-item');
    let allValid = true;
    for (let i = 0; i < contactItems.length; i++) {
        if (i < 2) {
            const item = contactItems[i];
            const email = item.querySelector('input[name="email[]"]');
            const telefone = item.querySelector('input[name="telefone[]"]');

            if (!email.value || !telefone.value) {
                statusMsg.textContent = '❌ Por favor, preencha todos os campos dos 2 primeiros contatos.';
                statusMsg.className = 'mensagem-status mensagem-erro';
                allValid = false;
                return;
            }
        }
    }

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
            departamentoEmail: item.querySelector('select[name="departamento_email[]"]').value,
            departamentoTelefone: item.querySelector('select[name="departamento_tel[]"]').value,
            preferencias: Array.from(item.querySelectorAll('input[name="comunicacoes[]"]:checked')).map(el => el.value)
        });
    });

    const payload = { cnpj, razaoSocial, faturamento, funcionarios, contatos };

    fetch('https://script.google.com/macros/s/AKfycbxKCyJ825KTBn1wFR77ouIXIWpNbPjJZpETRsCi7JytPSiEMdF8hKUshkV7VF8tQQ/exec', {
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

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('cnpj')) document.getElementById('cnpj').value = urlParams.get('cnpj');
if (urlParams.has('razaoSocial')) document.getElementById('razao').value = urlParams.get('razaoSocial');

function applyPhoneMask(element) {
    element.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        let formattedValue = '';
        if (value.length > 0) {
            formattedValue = `(${value.substring(0, 2)}`;
        }
        if (value.length > 2) {
            if (value.length > 10 || (value.length > 2 && value[2] === '9' && value.length >= 7)) {
                 formattedValue += `) ${value.substring(2, 7)}`;
                 if (value.length > 7) {
                    formattedValue += `-${value.substring(7, 11)}`;
                 }
            } else {
                formattedValue += `) ${value.substring(2, 6)}`;
                if (value.length > 6) {
                    formattedValue += `-${value.substring(6, 10)}`;
                }
            }
        }
        e.target.value = formattedValue;
    });
}

function applyCurrencyMask(element) {
    element.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        let formattedValue = '';
        if (value.length > 0) {
            formattedValue = (parseInt(value, 10) / 100).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                style: 'currency',
                currency: 'BRL'
            });
        }
        e.target.value = formattedValue;
    });
}

applyPhoneMask(document.querySelector('input[name="telefone[]"]'));
applyCurrencyMask(document.getElementById('faturamento'));

document.querySelector('.btn-add').addEventListener('click', function() {
    const contactSection = document.querySelector('.contact-item');
    const newContactItem = contactSection.cloneNode(true);
    
    const contactCount = document.querySelectorAll('.contact-item').length;
    const newTitle = document.createElement('h2');
    newTitle.className = 'contact-title';
    newTitle.textContent = `Contato ${contactCount + 1}`;
    this.parentNode.insertBefore(newTitle, this);

    newContactItem.querySelectorAll('input, select').forEach(element => {
        element.required = false;
        if (element.type === 'checkbox') {
            element.checked = false;
        } else {
            element.value = '';
        }
    });

    const newPhoneInput = newContactItem.querySelector('input[name="telefone[]"]');
    applyPhoneMask(newPhoneInput);

    this.parentNode.insertBefore(newContactItem, this);
});