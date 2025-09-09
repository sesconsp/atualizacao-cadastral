// Configuration
const CONFIG = {
    // Substitua pela URL do seu Google Apps Script Web App
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwwLgp5WIuA4V1Sfr8i3ypDHJwELYF3LoE03bv6MDMQNq2RQV777Eg4M9jrv7f-D-dd/exec',
    MAX_CONTACTS: 10,
    REQUIRED_CONTACTS: 1,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // ms
};

// DOM Elements
const form = document.getElementById('formulario');
const statusMsg = document.querySelector('.mensagem-status');
const addContactBtn = document.querySelector('.btn-add');
const submitBtn = document.querySelector('.btn-submit');

// Initialize form
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    setupEventListeners();
    loadURLParameters();
});

function initializeForm() {
    // Apply masks to initial inputs
    const initialPhoneInput = document.querySelector('input[name="telefone[]"]');
    const faturamentoInput = document.getElementById('faturamento');
    
    if (initialPhoneInput) applyPhoneMask(initialPhoneInput);
    if (faturamentoInput) applyCurrencyMask(faturamentoInput);
    
    updateRemoveButtonsVisibility();
    
    // Add loading state management
    setupLoadingStates();
}

function setupEventListeners() {
    // Form submission
    form.addEventListener('submit', handleFormSubmit);
    
    // Add contact button
    addContactBtn.addEventListener('click', addNewContact);
    
    // Real-time validation
    form.addEventListener('input', debounce(validateFormRealTime, 300));
    form.addEventListener('change', validateFormRealTime);
}

function setupLoadingStates() {
    // Disable form during submission
    const formElements = form.querySelectorAll('input, select, button');
    
    window.setFormLoading = function(loading) {
        formElements.forEach(element => {
            element.disabled = loading;
        });
        
        if (loading) {
            submitBtn.classList.add('loading');
            submitBtn.innerHTML = '<span>Enviando...</span>';
        } else {
            submitBtn.classList.remove('loading');
            submitBtn.innerHTML = '<span>Enviar Atualização</span>';
        }
    };
}

function loadURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('cnpj')) {
        const cnpj = urlParams.get('cnpj');
        document.getElementById('cnpj').value = formatCNPJ(cnpj);
    }
    
    if (urlParams.has('razaoSocial')) {
        document.getElementById('razao').value = urlParams.get('razaoSocial');
    }
    
    // Outros parâmetros opcionais
    if (urlParams.has('email')) {
        const firstEmailInput = document.querySelector('input[name="email[]"]');
        if (firstEmailInput) firstEmailInput.value = urlParams.get('email');
    }
    
    if (urlParams.has('telefone')) {
        const firstPhoneInput = document.querySelector('input[name="telefone[]"]');
        if (firstPhoneInput) firstPhoneInput.value = urlParams.get('telefone');
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    showStatus('Validando dados...', 'info');
    setFormLoading(true);
    
    try {
        if (!validateForm()) {
            return;
        }
        
        const formData = collectFormData();
        await submitFormDataWithRetry(formData);
        
    } catch (error) {
        console.error('Erro no envio:', error);
        showStatus('❌ Erro inesperado. Tente novamente.', 'error');
    } finally {
        setFormLoading(false);
    }
}

function validateForm() {
    const contactItems = document.querySelectorAll('.contact-item');
    const errors = [];
    
    // Validate required contacts
    for (let i = 0; i < Math.min(contactItems.length, CONFIG.REQUIRED_CONTACTS); i++) {
        const item = contactItems[i];
        const contactNumber = i + 1;
        
        const email = item.querySelector('input[name="email[]"]');
        const telefone = item.querySelector('input[name="telefone[]"]');
        const departamento = item.querySelector('select[name="departamento[]"]');
        const comunicacoes = item.querySelectorAll('input[name="comunicacoes[]"]:checked');
        
        if (!email.value.trim()) {
            errors.push(`E-mail do contato ${contactNumber} é obrigatório`);
            highlightField(email, true);
        } else if (!isValidEmail(email.value.trim())) {
            errors.push(`E-mail do contato ${contactNumber} não é válido`);
            highlightField(email, true);
        } else {
            highlightField(email, false);
        }
        
        if (!telefone.value.trim()) {
            errors.push(`Telefone do contato ${contactNumber} é obrigatório`);
            highlightField(telefone, true);
        } else {
            highlightField(telefone, false);
        }
        
        if (!departamento.value) {
            errors.push(`Departamento do contato ${contactNumber} é obrigatório`);
            highlightField(departamento, true);
        } else {
            highlightField(departamento, false);
        }
        
        if (comunicacoes.length === 0) {
            errors.push(`Selecione pelo menos um tipo de comunicação para o contato ${contactNumber}`);
        }
    }
    
    // Validate unique emails for first two contacts
    if (contactItems.length >= 2) {
        const firstEmail = contactItems[0].querySelector('input[name="email[]"]').value.trim();
        const secondEmail = contactItems[1].querySelector('input[name="email[]"]').value.trim();
        
        if (firstEmail && secondEmail && firstEmail === secondEmail) {
            errors.push('Os dois primeiros e-mails não podem ser iguais');
        }
    }
    
    // Validate company information
    const faturamento = document.getElementById('faturamento').value.trim();
    const funcionarios = document.getElementById('funcionarios').value.trim();
    
    if (!faturamento) {
        errors.push('Faturamento bruto anual é obrigatório');
        highlightField(document.getElementById('faturamento'), true);
    } else {
        highlightField(document.getElementById('faturamento'), false);
    }
    
    if (!funcionarios) {
        errors.push('Quantidade de funcionários é obrigatória');
        highlightField(document.getElementById('funcionarios'), true);
    } else if (parseInt(funcionarios) < 0) {
        errors.push('Quantidade de funcionários deve ser um número positivo');
        highlightField(document.getElementById('funcionarios'), true);
    } else {
        highlightField(document.getElementById('funcionarios'), false);
    }
    
    if (errors.length > 0) {
        showStatus(errors.join('<br>'), 'error');
        // Scroll to first error
        const firstErrorField = form.querySelector('.field-error');
        if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return false;
    }
    
    return true;
}

function validateFormRealTime() {
    // Remove previous error highlights
    form.querySelectorAll('.field-error').forEach(field => {
        highlightField(field, false);
    });
    
    // Validate email fields
    form.querySelectorAll('input[type="email"]').forEach(email => {
        if (email.value && !isValidEmail(email.value)) {
            highlightField(email, true);
        }
    });
    
    // Validate phone fields
    form.querySelectorAll('input[type="tel"]').forEach(phone => {
        if (phone.value && phone.value.length < 14) { // (XX) XXXX-XXXX
            highlightField(phone, true);
        }
    });
}

function highlightField(field, hasError) {
    if (hasError) {
        field.classList.add('field-error');
        field.style.borderColor = '#dc3545';
    } else {
        field.classList.remove('field-error');
        field.style.borderColor = '';
    }
}

function collectFormData() {
    const cnpj = document.getElementById('cnpj').value.trim();
    const razaoSocial = document.getElementById('razao').value.trim();
    const faturamento = document.getElementById('faturamento').value.trim();
    const funcionarios = document.getElementById('funcionarios').value.trim();
    
    const contatos = [];
    document.querySelectorAll('.contact-item').forEach((item, index) => {
        const email = item.querySelector('input[name="email[]"]').value.trim();
        const telefone = item.querySelector('input[name="telefone[]"]').value.trim();
        const departamento = item.querySelector('select[name="departamento[]"]').value;
        const preferencias = Array.from(item.querySelectorAll('input[name="comunicacoes[]"]:checked')).map(el => el.value);
        
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
        formVersion: '2.0',
        source: 'formulario_web'
    };
}

async function submitFormDataWithRetry(formData, attempt = 1) {
    showStatus(`Enviando dados... (tentativa ${attempt})`, 'info');
    
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
            showStatus('✔ Dados enviados com sucesso! Obrigado pela atualização.', 'success');
            
            // Optional: Reset form or show next steps
            setTimeout(() => {
                if (confirm('Dados enviados com sucesso! Deseja preencher outro formulário?')) {
                    resetForm();
                }
            }, 3000);
            
        } else {
            throw new Error(result.message || 'Erro desconhecido no servidor');
        }
        
    } catch (error) {
        console.error(`Tentativa ${attempt} falhou:`, error);
        
        if (attempt < CONFIG.RETRY_ATTEMPTS) {
            // Retry with exponential backoff
            const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
            setTimeout(() => {
                submitFormDataWithRetry(formData, attempt + 1);
            }, delay);
        } else {
            // All attempts failed
            showStatus('❌ Não foi possível enviar os dados após várias tentativas. Verifique sua conexão e tente novamente.', 'error');
        }
    }
}

function resetForm() {
    form.reset();
    
    // Remove additional contacts
    const additionalContacts = document.querySelectorAll('.contact-header');
    additionalContacts.forEach(header => header.remove());
    
    const contactItems = document.querySelectorAll('.contact-item');
    for (let i = 1; i < contactItems.length; i++) {
        contactItems[i].remove();
    }
    
    updateRemoveButtonsVisibility();
    hideStatus();
    
    // Reload URL parameters
    loadURLParameters();
}

function addNewContact() {
    const contactCount = document.querySelectorAll('.contact-item').length;
    
    if (contactCount >= CONFIG.MAX_CONTACTS) {
        showStatus(`Máximo de ${CONFIG.MAX_CONTACTS} contatos permitidos`, 'error');
        return;
    }
    
    const firstContactItem = document.querySelector('.contact-item');
    const newContactItem = firstContactItem.cloneNode(true);
    
    // Clear values and update attributes
    clearContactItem(newContactItem, contactCount + 1);
    
    // Create header for new contact
    const contactHeader = createContactHeader(contactCount + 1, newContactItem);
    
    // Insert before add button
    addContactBtn.parentNode.insertBefore(contactHeader, addContactBtn);
    addContactBtn.parentNode.insertBefore(newContactItem, addContactBtn);
    
    // Apply masks to new inputs
    const newPhoneInput = newContactItem.querySelector('input[name="telefone[]"]');
    if (newPhoneInput) applyPhoneMask(newPhoneInput);
    
    updateRemoveButtonsVisibility();
    
    // Focus on first input of new contact
    const firstInput = newContactItem.querySelector('input[name="email[]"]');
    if (firstInput) {
        firstInput.focus();
        firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function clearContactItem(contactItem, contactNumber) {
    // Clear all input values
    contactItem.querySelectorAll('input, select').forEach(element => {
        if (element.type === 'checkbox') {
            element.checked = false;
        } else {
            element.value = '';
        }
        
        // Make additional contacts optional
        if (contactNumber > CONFIG.REQUIRED_CONTACTS) {
            element.required = false;
        }
        
        // Remove error highlighting
        highlightField(element, false);
    });
    
    // Update IDs and labels
    contactItem.setAttribute('data-contact-number', contactNumber);
    
    contactItem.querySelectorAll('[id]').forEach(el => {
        const baseId = el.id.replace(/\d+$/, '');
        el.id = baseId + contactNumber;
    });
    
    contactItem.querySelectorAll('[for]').forEach(el => {
        const baseFor = el.htmlFor.replace(/\d+$/, '');
        el.htmlFor = baseFor + contactNumber;
    });
}

function createContactHeader(contactNumber, contactItem) {
    const header = document.createElement('div');
    header.className = 'contact-header';
    
    const title = document.createElement('h2');
    title.className = 'contact-title';
    title.textContent = `Contato ${contactNumber}`;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = 'Remover';
    removeBtn.setAttribute('aria-label', `Remover contato ${contactNumber}`);
    
    removeBtn.addEventListener('click', function() {
        if (confirm(`Tem certeza que deseja remover o Contato ${contactNumber}?`)) {
            header.remove();
            contactItem.remove();
            updateRemoveButtonsVisibility();
            renumberContacts();
        }
    });
    
    header.appendChild(title);
    header.appendChild(removeBtn);
    
    return header;
}

function updateRemoveButtonsVisibility() {
    const contactItems = document.querySelectorAll('.contact-item');
    const removeButtons = document.querySelectorAll('.btn-remove');
    
    removeButtons.forEach(btn => {
        if (contactItems.length <= 1) {
            btn.style.display = 'none';
        } else {
            btn.style.display = 'inline-block';
        }
    });
}

function renumberContacts() {
    const contactHeaders = document.querySelectorAll('.contact-header');
    const contactItems = document.querySelectorAll('.contact-item');
    
    contactHeaders.forEach((header, index) => {
        const title = header.querySelector('.contact-title');
        const removeBtn = header.querySelector('.btn-remove');
        
        title.textContent = `Contato ${index + 1}`;
        removeBtn.setAttribute('aria-label', `Remover contato ${index + 1}`);
    });
    
    contactItems.forEach((item, index) => {
        clearContactItem(item, index + 1);
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
            if (value.length > 10 || (value.length > 2 && value[2] === '9' && value.length >= 7)) {
                // Mobile format: (XX) 9XXXX-XXXX
                formattedValue += `) ${value.substring(2, 7)}`;
                if (value.length > 7) {
                    formattedValue += `-${value.substring(7, 11)}`;
                }
            } else {
                // Landline format: (XX) XXXX-XXXX
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

function showStatus(message, type) {
    statusMsg.innerHTML = message;
    statusMsg.className = `mensagem-status mensagem-${type === 'success' ? 'sucesso' : type === 'info' ? 'info' : 'erro'}`;
    statusMsg.style.display = 'block';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            hideStatus();
        }, 5000);
    }
    
    // Scroll to status message
    statusMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideStatus() {
    statusMsg.style.display = 'none';
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function formatCNPJ(cnpj) {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length === 14) {
        return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add CSS for info status
const style = document.createElement('style');
style.textContent = `
    .mensagem-info {
        background-color: rgba(23, 162, 184, 0.9);
        color: #fff;
        border: 2px solid #17a2b8;
    }
    
    .field-error {
        border-color: #dc3545 !important;
        box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2) !important;
    }
`;
document.head.appendChild(style);

// Initialize form when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeForm);
} else {
    initializeForm();
}
