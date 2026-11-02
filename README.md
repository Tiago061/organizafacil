# OrganizaFácil — Gerenciador de Documentos

Aplicativo React + TypeScript + Vite + Tailwind CSS, com React Router, Zustand, IndexedDB e Capacitor 7. Interface em português brasileiro, modo claro/escuro e layouts para celular e desktop. Sem backend, analytics, upload ou sincronização remota de documentos.

## Executar

Requer Node 22 ou superior.

```bash
npm ci
npm run dev
npm test
npm run build
```

## Arquitetura e decisões por etapa

1. `src/pages/`: Início, Documentos, Scanner, Details, Categories e Preferences. Cada tela controla seu formulário e usa componentes de `src/components/shared.tsx`. React Router usa hash para permitir navegação dentro do pacote nativo e hospedagem estática.
2. `src/store.ts`: Zustand mantém a projeção dos documentos, categorias e tema. O banco é a fonte de verdade, e a interface é atualizada após gravações concluídas.
3. `src/services/storage.ts`: IndexedDB guarda os metadados. No navegador, os Blobs ficam no mesmo banco; no aplicativo nativo, ficam no diretório privado Data do Filesystem. A assinatura inicial, o MIME e o limite de 25 MB são validados. Isso não equivale a uma análise antivírus ou a uma validação completa da estrutura de um PDF.
4. `src/services/image.ts`: Canvas executa recorte de quatro cantos e transformação projetiva (homografia). A rotação é aplicada à saída. Os cantos são manuais, sem detecção automática de bordas. jsPDF monta páginas A4 com proporção preservada. Sem OCR; pesquisa usa nome, categoria, pasta e observações.
5. `src/services/native.ts`: Camera, Filesystem, Share e LocalNotifications oficiais do Capacitor. No navegador, captura usa o seletor com `capture=environment`, compartilhamento usa Web Share ou download. Rascunhos de digitalização são preservados em IndexedDB, inclusive ao navegar entre telas.
6. `src/services/backup.ts`: backup JSON versionado, só por ação explícita. A restauração valida todos os registros antes da gravação, preserva documentos atuais e cria novos IDs para não sobrescrever arquivos. Falhas durante a restauração removem documentos já adicionados na mesma operação. Alertas restaurados precisam ser reativados nos detalhes.
7. `src/services/security.ts`: apenas contrato de extensão, capacidades desativadas. Não há implementação de criptografia própria nem de bloqueio biométrico. Antes de ativar, implementar Keychain/Keystore, migração dos arquivos, recuperação de gravações interrompidas e testes em aparelho.
8. `public/sw.js`: cache dos recursos locais visitados para funcionamento offline após o primeiro carregamento completo. No Capacitor, o bundle já está empacotado. Arquivos pessoais nunca entram no cache HTTP do service worker.

## Funcionalidades

- Imagens JPEG, PNG e WebP, além de PDFs; importação múltipla com validação por arquivo.
- Scanner com câmera/galeria, recorte, perspectiva, rotação, reordenação de páginas e PDF multipágina.
- Pesquisa, filtros, grade/lista, favoritos, categorias personalizadas e pastas por nome.
- Nome, categoria, pasta, observações e vencimento editáveis nos detalhes.
- Alertas locais às 9h da data configurada, mediante permissão, no app nativo. No navegador os vencimentos são mostrados no início; não há alerta em segundo plano.
- Backup/restore, exportação individual, compartilhamento e exclusão confirmada.
- Exemplos fictícios disponíveis em Ajustes por ação explícita; a instalação inicial começa vazia.

## Android e iOS

Os projetos `android/` e `ios/` já estão gerados, com plugins, permissões iOS, ícone de notificações e Privacy Manifest do Filesystem incluído no target Xcode.

```bash
npm run native:sync
npx cap open android
# ou, no macOS com Xcode e CocoaPods:
npx cap open ios
```

Android requer Android Studio, SDK e JDK 21. iOS requer macOS, Xcode, CocoaPods, equipe de assinatura e aparelho/simulador configurado. Após mudanças no front, execute novamente `npm run native:sync`.

O Android está com backup automático desativado e regras de exclusão de extração. O AppDelegate iOS marca Documents e Library como excluídos do backup do sistema. Essas configurações precisam ser verificadas em aparelhos e na política da versão de sistema alvo.

O seletor de arquivos HTML abre o seletor de documentos do WebView para importar PDFs e imagens. Camera usa o plugin no nativo; não salva automaticamente na galeria. O compartilhamento escreve uma cópia temporária no cache privado. O usuário escolhe o destino no painel do sistema. Downloads do navegador dependem do navegador; para exportar arquivos do app nativo prefira Compartilhar.

## Segurança, privacidade e limites conhecidos

- Backups são **sem criptografia**. Proteja as cópias e o aparelho.
- Não há afirmação de segurança criptográfica. As proteções fornecidas pelo sistema operacional não substituem uma implementação própria testada.
- Limpar os dados do site, desinstalar o aplicativo ou perder o aparelho pode remover os arquivos. Faça backups explícitos.
- IndexedDB e Filesystem não compartilham uma transação. Uma interrupção abrupta entre gravação do arquivo e metadados pode deixar arquivo órfão; há compensação para erros normais, mas recuperação de falhas de energia requer evolução antes de uso crítico.
- Captura interrompida pelo sistema antes de chegar ao JavaScript não é restaurada automaticamente; as páginas já adicionadas ao scanner são preservadas.
- PDFs são renderizados localmente em Canvas com PDF.js e worker empacotado, com navegação entre páginas. PDFs protegidos por senha não são suportados nesta versão. O comportamento precisa ser validado nos WebViews alvo.
- A restauração é aditiva; repetir um backup cria cópias. Limite de 150 MB e 1.000 documentos por backup; para acervos maiores, implementar formato de backup em streaming.
- A correção de perspectiva processa saída com largura máxima 1800 e altura máxima 2400. Imagens muito grandes podem exceder a memória do WebView na decodificação; prefira capturas moderadas.
- Data de vencimento passada é mostrada no início, sem tentar agendar alerta retroativo. Horários podem variar por economia de bateria e permissões do sistema.
- A sincronização Capacitor não substitui compilação nativa, assinatura ou homologação de publicação nas lojas.

## Validação executada

- TypeScript e build Vite de produção.
- Vitest: gravação/leitura/exclusão, assinatura de arquivo, formatos e tamanho, exclusão de categoria com migração, pré-validação e restauração aditiva.
- Inspeção visual e navegação no navegador. Projetos Capacitor gerados e sincronizados.
- **Não executado:** compilação Gradle/Xcode, testes físicos de câmera, notificações, compartilhamento e biometria/criptografia (não implementadas). O ambiente de desenvolvimento não possui Xcode/CocoaPods nem um aparelho conectado.

Referências: https://capacitorjs.com/docs/apis/camera · https://capacitorjs.com/docs/apis/filesystem · https://capacitorjs.com/docs/apis/share · https://capacitorjs.com/docs/apis/local-notifications
