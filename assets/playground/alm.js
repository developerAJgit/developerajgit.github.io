/* ALM & DevOps: run a Power Platform release pipeline end to end, with a
   solution checker quality gate, deployment settings, an approval and the
   matching YAML for Azure DevOps or GitHub Actions. */
(function (PG) {
  'use strict';
  var h = PG.h, panelHead = PG.panelHead, wait = PG.wait, rand = PG.rand, highlight = PG.highlight, fmtMs = PG.fmtMs, copyText = PG.copyText;

  var ENGINES = [['ado', 'Azure DevOps'], ['gha', 'GitHub Actions'], ['ppp', 'Power Platform Pipelines']];
  var YAML = {
    ado: [
      '# azure-pipelines.yml: release the OpsHub solution',
      'trigger:',
      '  branches:',
      '    include: [main]',
      '',
      'variables:',
      '  SolutionName: OpsHub',
      '',
      'stages:',
      '- stage: Build',
      '  jobs:',
      '  - job: Build',
      '    pool:',
      '      vmImage: windows-latest',
      '    steps:',
      '    - task: PowerPlatformToolInstaller@2',
      '    - task: PowerPlatformSetSolutionVersion@2',
      '      inputs:',
      '        authenticationType: PowerPlatformSPN',
      '        PowerPlatformSPN: pp-dev',
      '        SolutionName: $(SolutionName)',
      '        SolutionVersionNumber: 1.4.0.$(Build.BuildId)',
      '    - task: PowerPlatformExportSolution@2',
      '      inputs:',
      '        authenticationType: PowerPlatformSPN',
      '        PowerPlatformSPN: pp-dev',
      '        SolutionName: $(SolutionName)',
      '        SolutionOutputFile: $(Build.ArtifactStagingDirectory)/$(SolutionName)_managed.zip',
      '        Managed: true',
      '    - task: PowerPlatformChecker@2',
      '      inputs:',
      '        PowerPlatformSPN: pp-dev',
      '        FilesToAnalyze: $(Build.ArtifactStagingDirectory)/$(SolutionName)_managed.zip',
      '        RuleSet: $(SolutionCheckerRuleSet)',
      '        ErrorLevel: HighIssueCount',
      '        ErrorThreshold: 0',
      '    - publish: $(Build.ArtifactStagingDirectory)',
      '      artifact: drop',
      '',
      '- stage: Test',
      '  dependsOn: Build',
      '  jobs:',
      '  - deployment: DeployTest',
      '    environment: test',
      '    strategy:',
      '      runOnce:',
      '        deploy:',
      '          steps:',
      '          - task: PowerPlatformToolInstaller@2',
      '          - task: PowerPlatformImportSolution@2',
      '            inputs:',
      '              authenticationType: PowerPlatformSPN',
      '              PowerPlatformSPN: pp-test',
      '              SolutionInputFile: $(Pipeline.Workspace)/drop/$(SolutionName)_managed.zip',
      '              UseDeploymentSettingsFile: true',
      '              DeploymentSettingsFile: settings/test.json',
      '',
      '- stage: Production',
      '  dependsOn: Test',
      '  jobs:',
      '  - deployment: DeployProd',
      '    environment: production   # approval check lives on this environment',
      '    strategy:',
      '      runOnce:',
      '        deploy:',
      '          steps:',
      '          - task: PowerPlatformToolInstaller@2',
      '          - task: PowerPlatformImportSolution@2',
      '            inputs:',
      '              authenticationType: PowerPlatformSPN',
      '              PowerPlatformSPN: pp-prod',
      '              SolutionInputFile: $(Pipeline.Workspace)/drop/$(SolutionName)_managed.zip',
      '              UseDeploymentSettingsFile: true',
      '              DeploymentSettingsFile: settings/prod.json'
    ].join('\n'),
    gha: [
      '# .github/workflows/release.yml: release the OpsHub solution',
      'name: release-opshub',
      'on:',
      '  push:',
      '    branches: [main]',
      '',
      'jobs:',
      '  build:',
      '    runs-on: windows-latest',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - uses: microsoft/powerplatform-actions/actions-install@v1',
      '      - uses: microsoft/powerplatform-actions/export-solution@v1',
      '        with:',
      '          environment-url: ${{ vars.DEV_URL }}',
      '          app-id: ${{ vars.CLIENT_ID }}',
      '          client-secret: ${{ secrets.CLIENT_SECRET }}',
      '          tenant-id: ${{ vars.TENANT_ID }}',
      '          solution-name: OpsHub',
      '          managed: true',
      '          solution-output-file: out/OpsHub_managed.zip',
      '      - uses: microsoft/powerplatform-actions/check-solution@v1',
      '        with:',
      '          environment-url: ${{ vars.DEV_URL }}',
      '          app-id: ${{ vars.CLIENT_ID }}',
      '          client-secret: ${{ secrets.CLIENT_SECRET }}',
      '          tenant-id: ${{ vars.TENANT_ID }}',
      '          path: out/OpsHub_managed.zip',
      '      - uses: actions/upload-artifact@v4',
      '        with: { name: solution, path: out/ }',
      '',
      '  deploy-test:',
      '    needs: build',
      '    environment: test',
      '    runs-on: windows-latest',
      '    steps:',
      '      - uses: actions/download-artifact@v4',
      '        with: { name: solution, path: out/ }',
      '      - uses: microsoft/powerplatform-actions/actions-install@v1',
      '      - uses: microsoft/powerplatform-actions/import-solution@v1',
      '        with:',
      '          environment-url: ${{ vars.TEST_URL }}',
      '          app-id: ${{ vars.CLIENT_ID }}',
      '          client-secret: ${{ secrets.CLIENT_SECRET }}',
      '          tenant-id: ${{ vars.TENANT_ID }}',
      '          solution-file: out/OpsHub_managed.zip',
      '          use-deployment-settings-file: true',
      '          deployment-settings-file: settings/test.json',
      '',
      '  deploy-prod:',
      '    needs: deploy-test',
      '    environment: production   # required reviewers approve here',
      '    runs-on: windows-latest',
      '    steps:',
      '      - uses: actions/download-artifact@v4',
      '        with: { name: solution, path: out/ }',
      '      - uses: microsoft/powerplatform-actions/actions-install@v1',
      '      - uses: microsoft/powerplatform-actions/import-solution@v1',
      '        with:',
      '          environment-url: ${{ vars.PROD_URL }}',
      '          app-id: ${{ vars.CLIENT_ID }}',
      '          client-secret: ${{ secrets.CLIENT_SECRET }}',
      '          tenant-id: ${{ vars.TENANT_ID }}',
      '          solution-file: out/OpsHub_managed.zip',
      '          use-deployment-settings-file: true',
      '          deployment-settings-file: settings/prod.json'
    ].join('\n'),
    ppp: [
      '# Power Platform Pipelines (configured in the product, no YAML)',
      'pipeline: OpsHub release',
      'host-environment: Contoso Pipelines Host',
      'source: Dev - Ops Hub (managed environment)',
      'stages:',
      '  - name: Test',
      '    target: Test - Ops Hub',
      '    deployment-settings: environment variables + connection references',
      '  - name: Production',
      '    target: Prod - Ops Hub',
      '    pre-deployment-step: approval   # gated extension handled by a cloud flow',
      'requirements:',
      '  - targets are managed environments',
      '  - solutions are deployed as managed'
    ].join('\n')
  };
  var SETTINGS = '{\n  "EnvironmentVariables": [\n    { "SchemaName": "ops_ApiBaseUrl", "Value": "https://api-test.contoso.com" },\n    { "SchemaName": "ops_ApproverGroup", "Value": "sg-ops-approvers-test" }\n  ],\n  "ConnectionReferences": [\n    { "LogicalName": "ops_sharedcommondataserviceforapps", "ConnectionId": "<test-connection-id>", "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps" },\n    { "LogicalName": "ops_sharedoffice365", "ConnectionId": "<test-connection-id>", "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_office365" }\n  ]\n}';

  function initAlm(panel) {
    var s = { engine: 'ado', defect: false, running: false, build: 13, env: { Dev: '1.4.0.13', Test: '1.4.0.12', Prod: '1.4.0.11' }, sel: 0, approve: null, runs: [] };
    var STAGES = [
      { id: 'export', name: 'Export from Dev' },
      { id: 'source', name: 'Unpack & commit' },
      { id: 'check', name: 'Solution checker' },
      { id: 'build', name: 'Build managed' },
      { id: 'test', name: 'Deploy to Test' },
      { id: 'approve', name: 'Approval' },
      { id: 'prod', name: 'Deploy to Prod' }
    ];
    STAGES.forEach(function (x) { x.status = null; x.log = []; x.ms = 0; });

    var engBtns = ENGINES.map(function (e) { return h('button', { type: 'button', class: 'pg-chip', 'aria-pressed': String(e[0] === s.engine), onclick: function () { if (s.running) return; s.engine = e[0]; engBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(ENGINES[i][0] === s.engine)); }); renderCode(); } }, e[1]); });
    var defect = h('input', { type: 'checkbox' });
    defect.addEventListener('change', function () { s.defect = defect.checked; });
    var runBtn = h('button', { type: 'button', class: 'pg-btn go', onclick: run }, '▶ Run pipeline');
    var stageRow = h('ol', { class: 'alm-stages' });
    var logTitle = h('b');
    var log = h('div', { class: 'ca-term alm-log', role: 'log', 'aria-live': 'polite' });
    var envs = h('div', { class: 'alm-envs' });
    var history = h('ul', { class: 'fl-runs alm-hist' });
    var codeTabs = [['pipeline', 'Pipeline definition'], ['settings', 'Deployment settings']];
    var codeView = 'pipeline';
    var codeBtns = codeTabs.map(function (c) { return h('button', { type: 'button', class: 'ca-tab', 'aria-pressed': String(c[0] === codeView), onclick: function () { codeView = c[0]; codeBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(codeTabs[i][0] === codeView)); }); renderCode(); } }, c[1]); });
    var code = h('pre', { class: 'ca-code alm-code', tabindex: '0' });
    var copyBtn = h('button', { type: 'button', class: 'pg-btn small', onclick: function () { copyText(code.textContent, copyBtn); } }, 'Copy');

    panel.appendChild(panelHead('Ship it safely', 'Enterprise low-code still needs real release engineering. This pipeline exports a solution from Dev, puts it in source control, blocks anything the solution checker flags, deploys a managed build with per-environment settings, and waits for an approver before Production. Switch on the defect to see the quality gate stop a bad release.', PG.articleLink('Getting Started with PCF Development', 'Related: my PCF and Power Platform CLI guide ↗')));
    panel.appendChild(h('div', { class: 'alm' },
      h('div', { class: 'alm-top' },
        h('div', { class: 'pg-field' }, h('span', { text: 'Engine' }), h('div', { class: 'pg-chips' }, engBtns)),
        h('label', { class: 'pg-switch alm-def' }, defect, h('span', { class: 'pg-sw', 'aria-hidden': 'true' }), h('span', null, h('b', { text: 'Introduce a defect' }), h('small', { text: 'A change the checker should catch' }))),
        runBtn),
      stageRow,
      h('div', { class: 'alm-grid' },
        h('div', { class: 'alm-left' },
          h('div', { class: 'alm-log-h' }, logTitle),
          log,
          h('div', { class: 'ca-ide alm-ide' }, h('div', { class: 'ca-tabs' }, codeBtns, h('span', { class: 'api-sp' }), copyBtn), code)),
        h('div', { class: 'alm-right' },
          h('h4', { text: 'Environments' }), envs,
          h('h4', { text: 'Release history' }), history))));

    function renderStages() {
      stageRow.textContent = '';
      STAGES.forEach(function (x, i) {
        var st = x.status;
        stageRow.appendChild(h('li', { class: 'alm-st ' + (st || 'idle') + (i === s.sel ? ' sel' : '') },
          h('button', { type: 'button', onclick: function () { s.sel = i; renderStages(); renderLog(); }, 'aria-label': x.name + (st ? ', ' + st : '') },
            h('span', { class: 'alm-dot', 'aria-hidden': 'true' }),
            h('span', { class: 'alm-name', text: x.name }),
            h('small', { text: st === 'ok' ? fmtMs(x.ms) : st === 'fail' ? 'Failed' : st === 'skip' ? 'Skipped' : st === 'run' ? 'Running' : st === 'wait' ? 'Waiting' : 'Not run' }))));
      });
    }
    function renderLog() {
      var x = STAGES[s.sel];
      logTitle.textContent = x.name + ' · log';
      log.textContent = '';
      if (x.status === 'wait' && s.approve) {
        log.appendChild(h('div', { class: 'alm-appr' },
          h('p', null, 'Release ', h('b', { text: '1.4.0.' + s.build }), ' passed Test. Approve deployment to Production?'),
          h('div', { class: 'fl-approval-btns' },
            h('button', { type: 'button', class: 'pg-btn go small', onclick: function () { s.approve(true); } }, 'Approve'),
            h('button', { type: 'button', class: 'pg-btn small', onclick: function () { s.approve(false); } }, 'Reject'))));
      }
      if (!x.log.length && x.status !== 'wait') log.appendChild(h('div', { class: 'dim', text: s.running ? 'Waiting for earlier stages…' : 'Run the pipeline to see logs. Click any stage to view its log.' }));
      x.log.forEach(function (l) { log.appendChild(h('div', { class: l[0], text: l[1] })); });
      log.scrollTop = log.scrollHeight;
    }
    function renderEnvs() {
      envs.textContent = '';
      [['Dev', 'Unmanaged · developers'], ['Test', 'Managed · UAT'], ['Prod', 'Managed · live']].forEach(function (e) {
        envs.appendChild(h('div', { class: 'alm-env' + (s.flash === e[0] ? ' flash' : '') }, h('div', null, h('b', { text: e[0] }), h('small', { text: e[1] })), h('code', { text: s.env[e[0]] })));
      });
      history.textContent = '';
      if (!s.runs.length) history.appendChild(h('li', { class: 'muted', text: 'No releases yet.' }));
      s.runs.slice(0, 4).forEach(function (r) {
        history.appendChild(h('li', null, r.ok ? h('span', { class: 'tick', 'aria-hidden': 'true' }) : h('span', { class: 'alm-x', 'aria-hidden': 'true', text: '✕' }), h('b', { class: r.ok ? '' : 'bad', text: r.label }), h('span', { text: r.ver + ' · ' + fmtMs(r.ms) }), h('time', { text: r.at })));
      });
    }
    function renderCode() { code.innerHTML = highlight(codeView === 'pipeline' ? YAML[s.engine] : SETTINGS, codeView === 'pipeline' ? 'yaml' : 'ts'); }
    function say(x, cls, text) { x.log.push([cls || '', text]); if (STAGES[s.sel] === x) renderLog(); }

    async function stage(i, fn) {
      var x = STAGES[i];
      s.sel = i; x.status = 'run'; renderStages(); renderLog();
      var t0 = performance.now();
      var ok = await fn(x);
      x.ms = Math.round(performance.now() - t0);
      x.status = ok ? 'ok' : 'fail';
      renderStages(); renderLog();
      return ok;
    }
    async function run() {
      if (s.running) return;
      s.running = true; runBtn.disabled = true; defect.disabled = true; engBtns.forEach(function (b) { b.disabled = true; });
      STAGES.forEach(function (x) { x.status = null; x.log = []; x.ms = 0; });
      s.build++;
      var ver = '1.4.0.' + s.build, t0 = performance.now(), ok = true, label = 'Released';
      var steps = [
        async function (x) { say(x, 'dim', '> pac solution export --name OpsHub --managed false'); await wait(500); say(x, '', 'Exporting solution OpsHub ' + ver + ' from Dev…'); await wait(rand(500, 800)); say(x, 'ok', '✓ OpsHub_' + ver.replace(/\./g, '_') + '.zip (2.4 MB)'); return true; },
        async function (x) { say(x, 'dim', '> pac solution unpack --zipfile OpsHub.zip --folder src/OpsHub'); await wait(450); say(x, '', 'Unpacked ' + rand(180, 240) + ' files'); await wait(300); say(x, 'ok', '✓ Committed to main · ' + Math.random().toString(16).slice(2, 9)); return true; },
        async function (x) {
          say(x, '', 'Analysing OpsHub with the solution checker…'); await wait(rand(900, 1300));
          if (s.defect) {
            say(x, 'bad', '✕ 1 critical issue: plug-in "SyncVendor" makes a synchronous call to an external service.');
            say(x, 'bad', '✕ 1 high issue: canvas app formula uses a non-delegable filter on a large table.');
            say(x, 'warn', 'Quality gate: high or critical issues = 2, allowed = 0. Failing the build.');
            return false;
          }
          say(x, '', 'Critical 0 · High 0 · Medium 3 · Low 7'); say(x, 'ok', '✓ Quality gate passed (no high or critical issues)'); return true;
        },
        async function (x) { say(x, '', 'Setting version ' + ver + ' and exporting as managed…'); await wait(rand(600, 900)); say(x, 'ok', '✓ OpsHub_managed.zip published as a build artifact'); return true; },
        async function (x) { say(x, '', 'Importing managed solution into Test…'); await wait(rand(900, 1300)); say(x, '', 'Applying deployment settings: 2 environment variables, 2 connection references'); await wait(500); say(x, '', 'Running smoke tests…'); await wait(600); say(x, 'ok', '✓ 12/12 smoke tests passed'); s.env.Test = ver; s.flash = 'Test'; renderEnvs(); return true; },
        async function (x) {
          x.status = 'wait'; renderStages();
          say(x, '', 'Waiting for the release manager to approve…');
          var yes = await new Promise(function (res) { s.approve = res; renderLog(); });
          s.approve = null;
          if (!yes) { say(x, 'bad', '✕ Rejected. Production was not changed.'); label = 'Rejected'; return false; }
          say(x, 'ok', '✓ Approved by the release manager'); return true;
        },
        async function (x) { say(x, '', 'Importing managed solution into Production…'); await wait(rand(1000, 1400)); say(x, '', 'Applying production settings and turning on flows'); await wait(500); say(x, 'ok', '✓ ' + ver + ' is live in Production'); s.env.Prod = ver; s.flash = 'Prod'; renderEnvs(); return true; }
      ];
      for (var i = 0; i < STAGES.length; i++) {
        if (!ok) { STAGES[i].status = 'skip'; continue; }
        ok = await stage(i, steps[i]);
        if (!ok && i === 2) label = 'Blocked by quality gate';
      }
      renderStages();
      s.env.Dev = ver;
      s.runs.unshift({ ok: ok, label: ok ? 'Released' : label, ver: ver, ms: Math.round(performance.now() - t0), at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      s.flash = null; renderEnvs();
      if (!ok && label === 'Blocked by quality gate') { s.sel = 2; renderStages(); renderLog(); say(STAGES[2], 'warn', 'Fix the issues (switch the defect off) and run again.'); }
      s.running = false; runBtn.disabled = false; defect.disabled = false; engBtns.forEach(function (b) { b.disabled = false; });
    }
    renderStages(); renderLog(); renderEnvs(); renderCode();
  }

  PG.register({ id: 'alm', order: 90, group: 'Operate', short: 'ALM', name: 'ALM & DevOps', color: '#7c3aed', icon: 'M6 3v12M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9c0 5-12 3-12 6', init: initAlm });
})(window.PG);
