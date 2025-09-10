document.addEventListener('DOMContentLoaded', function () {
    const contatosContainer = document.getElementById('contatosContainer');
    const addContatoBtn = document.getElementById('addContatoBtn');
    let contatoCount = 0;

    function createContato(index) {
        const div = document.createElement('div');
        div.classList.add('contato-block');

        div.innerHTML = `
            <h4>Contato ${index + 1}</h4>
            <label>E-mail:</label>
            <input type="email" name="email" placeholder="ex: contato@empresa.com" required>
            <label>Telefone:</label>
            <input type="text" name="telefone" placeholder="(DD) 99999-9999" required>
            <label>Departamento:</label>
            <select name="departamento" required>
                <option value="">Selecione</option>
                <option>Sócio</option>
                <option>Diretoria</option>
                <option>Recursos Humanos (RH)</option>
                <option>Departamento Pessoal</option>
                <option>Financeiro</option>
                <option>Contabilidade</option>
                <option>Jurídico</option>
                <option>Marketing</option>
                <option>Outros</option>
            </select>
            <div class="checkbox-group">
                <p>Selecione os tipos de comunicação que deseja receber:</p>
                <label><input type="checkbox" value="Boletos e Comunicados Financeiros"> Boletos e Comunicados Financeiros</label>
                <label><input type="checkbox" value="Cursos, eventos e outros produtos e serviços"> Cursos, eventos e outros produtos e serviços</label>
                <label><input type="checkbox" value="Convocações para Assembleias"> Convocações para Assembleias</label>
                <label><input type="checkbox" value="Notícias e Informativos Gerais"> Notícias e Informativos Gerais</label>
            </div>
        `;

        if (index >= 2) {
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remover';
            removeBtn.type = 'button';
            removeBtn.style.background = 'red';
            removeBtn.style.color = '#fff';
            removeBtn.style.marginTop = '10px';
            removeBtn.onclick = function () {
                contatosContainer.removeChild(div);
                contatoCount--;
            };
            div.appendChild(removeBtn);
        }

        contatosContainer.appendChild(div);
    }

    // Criar 2 contatos obrigatórios
    for (let i = 0; i < 2; i++) {
        createContato(contatoCount);
        contatoCount++;
    }

    addContatoBtn.addEventListener('click', function () {
        createContato(contatoCount);
        contatoCount++;
    });
});
