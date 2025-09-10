// Configuração
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/SEU_SCRIPT_ID_AQUI/exec',
    MAX_CONTACTS: 10,
    REQUIRED_CONTACTS: 2,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
};

// Elementos DOM
let contactCounter = 2; // Começamos com 2 contatos já no HTML

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    setupEventListeners();
    loadURLParameters();
});

function initializeForm() {
    // Aplicar máscaras aos campos iniciais
    applyPhoneMasks();
    applyCurrencyMask();
    
    // Configurar validação de e-mail
    setupEmailValidation();
    
    // Configurar validação de checkboxes
    setupCheckboxValidation();
}

function setupEventListeners() {
    // Envio do formulário
    document.getElementById('formulario').addEventListener('submit', handleFormSubmit);
    
    // Botão adicionar contato
    document.getElementById('addContactBtn').addEventListener('click', addNewContact);
    
    // Validação em tempo real
    document.getElementById('formulario').addEventListener('input', validateFieldRealTime);
    document.getElementById('formulario').addEventListener('change', validateFieldRealTime);
}

function loadURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('cnpj')) {
        document.getElementById('cnpj').value = formatCNPJ(urlParams.get('cnpj'));
    }
    
    if (urlParams.has('razaoSocial')) {
        document.getElementById('razao').value = urlParams.get('razaoSocial');
    }
    
    if (urlParams.has('email')) {
        const firstEmailInput = document.getElementById('email1');
        if (firstEmailInput) firstEmailInput.value = urlParams.get('email');
    }
    
    if (urlParams.has('telefone')) {
        const firstPhoneInput = document.getElementById('telefone1');
        if (firstPhoneInput) firstPhoneInput.value = urlParams.get('telefone');
    }
}

// Máscaras de entrada
function applyPhoneMasks() {
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        applyPhoneMask(input);
    });
}

function applyPhoneMask(element) {
    element.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        let formattedValue = '';
        
        if (value.length > 0) {
            formattedValue = `(${value.substring(0, 2)}`;
        }
        if (value.length > 2) {
            formattedValue += `) ${value.substring(2, 7)}`;
            if (value.length > 7) {
                formattedValue += `-${value.substring(7, 11)}`;
            }
        }
        
        e.target.value = formattedValue;
    });
}

function applyCurrencyMask() {
    const faturamentoInput = document.getElementById('faturamento');
    if (faturamentoInput) {
        faturamentoInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length === 0) {
                e.target.value = '';
                return;
            }
            
            const numericValue = parseInt(value, 10) / 100;
            const formattedValue = numericValue.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                style: 'currency',
                currency: 'BRL'
            });
            
            e.target.value = formattedValue;
        });
    }
}

// Validação de e-mail
function setupEmailValidation() {
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateEmail(this);
        });
    });
}

function validateEmail(emailInput) {
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (email && !emailRegex.test(email)) {
        showFieldError(emailInput, 'E-mail inválido');
        return false;
    } else {
        clearFieldError(emailInput);
        return true;
    }
}

// Validação de checkboxes
function setupCheckboxValidation() {
    const contactBlocks = document.querySelectorAll('.contact-block');
    contactBlocks.forEach((block, index) => {
        const checkboxes = block.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                validateCheckboxGroup(block, index < CONFIG.REQUIRED_CONTACTS);
            });
        });
    });
}

function validateCheckboxGroup(contactBlock, isRequired) {
    const checkboxes = contactBlock.querySelectorAll('input[type="checkbox"]');
    const checkedBoxes = contactBlock.querySelectorAll('input[type="checkbox"]:checked');
    
    if (isRequired && checkedBoxes.length === 0) {
        showCheckboxGroupError(contactBlock, 'Selecione pelo menos um tipo de comunicação');
        return false;
    } else {
        clearCheckboxGroupError(contactBlock);
        return true;
    }
}

// Adicionar novo contato
function addNewContact() {
    if (contactCounter >= CONFIG.MAX_CONTACTS) {
        showStatus(`Máximo de ${CONFIG.MAX_CONTACTS} contatos permitidos`, 'erro');
        return;
    }
    
    contactCounter++;
    
    const newContactBlock = createContactBlock(contactCounter);
    const addButton = document.getElementById('addContactBtn');
    addButton.parentNode.insertBefore(newContactBlock, addButton);
    
    // Aplicar máscaras ao novo contato
    const newPhoneInput = newContactBlock.querySelector('input[type="tel"]');
    if (newPhoneInput) applyPhoneMask(newPhoneInput);
    
    // Configurar validação de e-mail
    const newEmailInput = newContactBlock.querySelector('input[type="email"]');
    if (newEmailInput) {
        newEmailInput.addEventListener('blur', function() {
            validateEmail(this);
        });
    }
    
    // Configurar validação de checkboxes
    setupCheckboxValidationForBlock(newContactBlock, false);
    
    // Focar no primeiro campo do novo contato
    newEmailInput.focus();
}

function createContactBlock(contactNumber) {
    const contactBlock = document.createElement('div');
    contactBlock.className = 'contact-block';
    contactBlock.setAttribute('data-contact-number', contactNumber);
    
    const removeButton = contactNumber > CONFIG.REQUIRED_CONTACTS ? 
        `<button type="button" class="btn-remove" onclick="removeContact(this)">Remover</button>` : '';
    
    contactBlock.innerHTML = `
        <h3 class="contact-title">
            Contato ${contactNumber}
            ${removeButton}
        </h3>
        
        <div class="form-group">
            <label for="email${contactNumber}">Este e-mail receberá os comunicados selecionados abaixo:</label>
            <input type="email" id="email${contactNumber}" name="email[]" placeholder="ex: contato@empresa.com" ${contactNumber <= CONFIG.REQUIRED_CONTACTS ? 'required' : ''}>
        </div>
        
        <div class="form-group">
            <label for="telefone${contactNumber}">Telefone:</label>
            <input type="tel" id="telefone${contactNumber}" name="telefone[]" placeholder="(DD) 99999-9999" ${contactNumber <= CONFIG.REQUIRED_CONTACTS ? 'required' : ''}>
        </div>
        
        <div class="form-group">
            <label for="departamento${contactNumber}">Departamento:</label>
            <select id="departamento${contactNumber}" name="departamento[]" ${contactNumber <= CONFIG.REQUIRED_CONTACTS ? 'required' : ''}>
                <option value="">Selecione</option>
                <option value="Socio">Sócio</option>
                <option value="Diretoria">Diretoria</option>
                <option value="Recursos Humanos">Recursos Humanos (RH)</option>
                <option value="Departamento Pessoal">Departamento Pessoal</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Contabilidade">Contabilidade</option>
                <option value="Juridico">Jurídico</option>
                <option value="Marketing">Marketing</option>
                <option value="Outros">Outros</option>
            </select>
        </div>

        <div class="form-group">
            <p class="comunicacao-titulo">Selecione os tipos de comunicação que deseja receber:</p>
            <div class="checkbox-group">
                <label class="checkbox-label">
                    <input type="checkbox" name="comunicacoes[]" value="Boletos" ${contactNumber <= CONFIG.REQUIRED_CONTACTS ? 'required' : ''}>
                    <span class="checkmark"></span>
                    Boletos e Comunicados Financeiros
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" name="comunicacoes[]" value="Cursos">
                    <span class="checkmark"></span>
                    Cursos, eventos e outros produtos e serviços
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" name="comunicacoes[]" value="Assembleias">
                    <span class="checkmark"></span>
                    Convocações para Assembleias
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" name="comunicacoes[]" value="Noticias">
                    <span class="checkmark"></span>
                    Notícias e Informativos Gerais
                </label>
            </div>
        </div>
    `;
    
    return contactBlock;
}

function setupCheckboxValidationForBlock(contactBlock, isRequired) {
    const checkboxes = contactBlock.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            validateCheckboxGroup(contactBlock, isRequired);
        });
    });
}

function removeContact(button) {
    const contactBlock = button.closest('.contact-block');
    const contactNumber = parseInt(contactBlock.getAttribute('data-contact-number'));
    
    if (contactNumber <= CONFIG.REQUIRED_CONTACTS) {
        showStatus('Não é possível remover os contatos obrigatórios', 'erro');
        return;
    }
    
    if (confirm(`Tem certeza que deseja remover o Contato ${contactNumber}?`)) {
        contactBlock.remove();
        renumberContacts();
    }
}

function renumberContacts() {
    const contactBlocks = document.querySelectorAll('.contact-block');
    contactCounter = 0;
    
    contactBlocks.forEach((block, index) => {
        contactCounter++;
        const newNumber = index + 1;
        
        block.setAttribute('data-contact-number', newNumber);
        
        // Atualizar título
        const title = block.querySelector('.contact-title');
        const removeButton = block.querySelector('.btn-remove');
        
        if (newNumber <= CONFIG.REQUIRED_CONTACTS) {
            title.innerHTML = newNumber === 1 ? '' : `Contato ${newNumber}`;
            if (removeButton) removeButton.remove();
        } else {
            title.innerHTML = `Contato ${newNumber} <button type="button" class="btn-remove" onclick="removeContact(this)">Remover</button>`;
        }
        
        // Atualizar IDs e names
        const inputs = block.querySelectorAll('input, select');
        inputs.forEach(input => {
            const oldId = input.id;
            const baseName = oldId.replace(/\d+$/, '');
            input.id = baseName + newNumber;
            
            const label = block.querySelector(`label[for="${oldId}"]`);
            if (label) label.setAttribute('for', input.id);
        });
    });
}

// Validação do formulário
function handleFormSubmit(e) {
    e.preventDefault();
    
    showStatus('Validando dados...', 'info');
    
    if (!validateForm()) {
        return;
    }
    
    const formData = collectFormData();
    submitFormData(formData);
}

function validateForm() {
    let isValid = true;
    const errors = [];
    
    // Validar contatos obrigatórios
    const contactBlocks = document.querySelectorAll('.contact-block');
    
    for (let i = 0; i < Math.min(contactBlocks.length, CONFIG.REQUIRED_CONTACTS); i++) {
        const block = contactBlocks[i];
        const contactNumber = i + 1;
        
        const email = block.querySelector('input[type="email"]');
        const telefone = block.querySelector('input[type="tel"]');
        const departamento = block.querySelector('select');
        
        // Validar e-mail
        if (!email.value.trim()) {
            showFieldError(email, 'E-mail é obrigatório');
            errors.push(`E-mail do contato ${contactNumber} é obrigatório`);
            isValid = false;
        } else if (!validateEmail(email)) {
            errors.push(`E-mail do contato ${contactNumber} é inválido`);
            isValid = false;
        }
        
        // Validar telefone
        if (!telefone.value.trim()) {
            showFieldError(telefone, 'Telefone é obrigatório');
            errors.push(`Telefone do contato ${contactNumber} é obrigatório`);
            isValid = false;
        } else if (telefone.value.replace(/\D/g, '').length < 10) {
            showFieldError(telefone, 'Telefone deve ter pelo menos 10 dígitos');
            errors.push(`Telefone do contato ${contactNumber} é inválido`);
            isValid = false;
        } else {
            clearFieldError(telefone);
        }
        
        // Validar departamento
        if (!departamento.value) {
            showFieldError(departamento, 'Departamento é obrigatório');
            errors.push(`Departamento do contato ${contactNumber} é obrigatório`);
            isValid = false;
        } else {
            clearFieldError(departamento);
        }
        
        // Validar checkboxes
        if (!validateCheckboxGroup(block, true)) {
            errors.push(`Selecione pelo menos um tipo de comunicação para o contato ${contactNumber}`);
            isValid = false;
        }
    }
    
    // Validar e-mails únicos nos primeiros dois contatos
    if (contactBlocks.length >= 2) {
        const email1 = contactBlocks[0].querySelector('input[type="email"]').value.trim();
        const email2 = contactBlocks[1].querySelector('input[type="email"]').value.trim();
        
        if (email1 && email2 && email1 === email2) {
            showFieldError(contactBlocks[1].querySelector('input[type="email"]'), 'E-mail deve ser diferente do primeiro contato');
            errors.push('Os dois primeiros e-mails não podem ser iguais');
            isValid = false;
        }
    }
    
    // Validar informações da empresa
    const faturamento = document.getElementById('faturamento');
    const funcionarios = document.getElementById('funcionarios');
    
    if (!faturamento.value.trim()) {
        showFieldError(faturamento, 'Faturamento é obrigatório');
        errors.push('Faturamento bruto anual é obrigatório');
        isValid = false;
    } else {
        clearFieldError(faturamento);
    }
    
    if (!funcionarios.value.trim()) {
        showFieldError(funcionarios, 'Quantidade de funcionários é obrigatória');
        errors.push('Quantidade de funcionários é obrigatória');
        isValid = false;
    } else if (parseInt(funcionarios.value) < 0) {
        showFieldError(funcionarios, 'Quantidade deve ser um número positivo');
        errors.push('Quantidade de funcionários deve ser um número positivo');
        isValid = false;
    } else {
        clearFieldError(funcionarios);
    }
    
    if (!isValid) {
        showStatus(errors.join('<br>'), 'erro');
        // Scroll para o primeiro erro
        const firstError = document.querySelector('.field-error');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    return isValid;
}

function validateFieldRealTime(e) {
    const field = e.target;
    
    if (field.type === 'email') {
        validateEmail(field);
    } else if (field.type === 'tel') {
        const value = field.value.replace(/\D/g, '');
        if (value.length > 0 && value.length < 10) {
            showFieldError(field, 'Telefone deve ter pelo menos 10 dígitos');
        } else {
            clearFieldError(field);
        }
    }
}

// Coleta de dados do formulário
function collectFormData() {
    const cnpj = document.getElementById('cnpj').value.trim();
    const razaoSocial = document.getElementById('razao').value.trim();
    const faturamento = document.getElementById('faturamento').value.trim();
    const funcionarios = document.getElementById('funcionarios').value.trim();
    
    const contatos = [];
    const contactBlocks = document.querySelectorAll('.contact-block');
    
    contactBlocks.forEach((block, index) => {
        const email = block.querySelector('input[type="email"]').value.trim();
        const telefone = block.querySelector('input[type="tel"]').value.trim();
        const departamento = block.querySelector('select').value;
        const preferencias = Array.from(block.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        
        if (email || telefone || departamento || preferencias.length > 0) {
            contatos.push({
                numero: index + 1,
                email,
                telefone,
                departamento,
                preferencias
            });
        }
    });
    
    return {
        cnpj,
        razaoSocial,
        faturamento,
        funcionarios: parseInt(funcionarios) || 0,
        contatos,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        formVersion: '2.1'
    };
}

// Envio de dados
async function submitFormData(formData) {
    showStatus('Enviando dados...', 'info');
    setFormLoading(true);
    
    try {
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showStatus('✔ Dados enviados com sucesso! Obrigado pela atualização.', 'sucesso');
            
            setTimeout(() => {
                if (confirm('Dados enviados com sucesso! Deseja preencher outro formulário?')) {
                    resetForm();
                }
            }, 3000);
        } else {
            throw new Error(result.message || 'Erro desconhecido no servidor');
        }
        
    } catch (error) {
        console.error('Erro ao enviar formulário:', error);
        showStatus('❌ Erro ao enviar os dados. Verifique sua conexão e tente novamente.', 'erro');
    } finally {
        setFormLoading(false);
    }
}

// Funções auxiliares
function showStatus(message, type) {
    const statusElement = document.querySelector('.mensagem-status');
    statusElement.innerHTML = message;
    statusElement.className = `mensagem-status mensagem-${type}`;
    statusElement.style.display = 'block';
    
    if (type === 'sucesso') {
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }
    
    statusElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showFieldError(field, message) {
    field.classList.add('field-error');
    
    // Remover mensagem de erro anterior
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Adicionar nova mensagem de erro
    const errorElement = document.createElement('span');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    field.parentNode.appendChild(errorElement);
}

function clearFieldError(field) {
    field.classList.remove('field-error');
    const errorElement = field.parentNode.querySelector('.error-message');
    if (errorElement) {
        errorElement.remove();
    }
}

function showCheckboxGroupError(contactBlock, message) {
    const checkboxGroup = contactBlock.querySelector('.checkbox-group');
    checkboxGroup.classList.add('field-error');
    
    const existingError = checkboxGroup.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    const errorElement = document.createElement('span');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    checkboxGroup.parentNode.appendChild(errorElement);
}

function clearCheckboxGroupError(contactBlock) {
    const checkboxGroup = contactBlock.querySelector('.checkbox-group');
    checkboxGroup.classList.remove('field-error');
    const errorElement = checkboxGroup.parentNode.querySelector('.error-message');
    if (errorElement) {
        errorElement.remove();
    }
}

function setFormLoading(loading) {
    const submitBtn = document.querySelector('.btn-submit');
    const formElements = document.querySelectorAll('input, select, button');
    
    formElements.forEach(element => {
        element.disabled = loading;
    });
    
    if (loading) {
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'Enviando...';
    } else {
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'Enviar Atualização';
    }
}

function resetForm() {
    document.getElementById('formulario').reset();
    
    // Remover contatos adicionais
    const contactBlocks = document.querySelectorAll('.contact-block');
    for (let i = CONFIG.REQUIRED_CONTACTS; i < contactBlocks.length; i++) {
        contactBlocks[i].remove();
    }
    
    contactCounter = CONFIG.REQUIRED_CONTACTS;
    
    // Limpar erros
    document.querySelectorAll('.field-error').forEach(field => {
        clearFieldError(field);
    });
    
    document.querySelectorAll('.error-message').forEach(error => {
        error.remove();
    });
    
    // Ocultar status
    document.querySelector('.mensagem-status').style.display = 'none';
    
    // Recarregar parâmetros da URL
    loadURLParameters();
}

function formatCNPJ(cnpj) {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length === 14) {
        return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
}
