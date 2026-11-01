const STANDARD_USER_MAX_VALUE = 500;
const PRIORITY_VALUE_THRESHOLD = 1000;
const HIGHLIGHT_STYLE = ' style="font-weight:bold;"';

/** Formato nulo: um tipo de relatório desconhecido não gera nenhuma saída. */
class ReportFormatter {
  header() {
    return '';
  }

  row() {
    return '';
  }

  footer() {
    return '';
  }
}

class CsvFormatter extends ReportFormatter {
  header() {
    return 'ID,NOME,VALOR,USUARIO\n';
  }

  row(item, user) {
    return `${item.id},${item.name},${item.value},${user.name}\n`;
  }

  footer(total) {
    return `\nTotal,,\n${total},,\n`;
  }
}

class HtmlFormatter extends ReportFormatter {
  header(user) {
    return (
      '<html><body>\n' +
      '<h1>Relatório</h1>\n' +
      `<h2>Usuário: ${user.name}</h2>\n` +
      '<table>\n' +
      '<tr><th>ID</th><th>Nome</th><th>Valor</th></tr>\n'
    );
  }

  row(item, user, highlighted) {
    const style = highlighted ? HIGHLIGHT_STYLE : '';
    return `<tr${style}><td>${item.id}</td><td>${item.name}</td><td>${item.value}</td></tr>\n`;
  }

  footer(total) {
    return `</table>\n<h3>Total: ${total}</h3>\n</body></html>\n`;
  }
}

/** Política nula: um perfil desconhecido não vê nenhum item. */
class RolePolicy {
  canSee() {
    return false;
  }

  markPriority() {}

  isHighlighted() {
    return false;
  }
}

class AdminPolicy extends RolePolicy {
  canSee() {
    return true;
  }

  markPriority(item) {
    if (item.value > PRIORITY_VALUE_THRESHOLD) {
      item.priority = true;
    }
  }

  isHighlighted(item) {
    return item.priority;
  }
}

class StandardUserPolicy extends RolePolicy {
  canSee(item) {
    return item.value <= STANDARD_USER_MAX_VALUE;
  }
}

const FORMATTERS = new Map([
  ['CSV', new CsvFormatter()],
  ['HTML', new HtmlFormatter()],
]);

const ROLE_POLICIES = new Map([
  ['ADMIN', new AdminPolicy()],
  ['USER', new StandardUserPolicy()],
]);

function selectVisibleItems(items, policy) {
  const visibleItems = [...items].filter((item) => policy.canSee(item));
  visibleItems.forEach((item) => policy.markPriority(item));
  return visibleItems;
}

function sumValues(items) {
  return items.reduce((total, item) => total + item.value, 0);
}

export class ReportGenerator {
  constructor(database) {
    this.db = database;
  }

  /**
   * Gera um relatório de itens baseado no tipo e no usuário.
   * - Admins veem tudo.
   * - Users comuns só veem itens com valor <= 500.
   */
  generateReport(reportType, user, items) {
    const formatter = FORMATTERS.get(reportType) ?? new ReportFormatter();
    const policy = ROLE_POLICIES.get(user.role) ?? new RolePolicy();
    const visibleItems = selectVisibleItems(items, policy);

    const rows = visibleItems.map((item) =>
      formatter.row(item, user, policy.isHighlighted(item)),
    );
    const report =
      formatter.header(user) + rows.join('') + formatter.footer(sumValues(visibleItems));

    return report.trim();
  }
}
