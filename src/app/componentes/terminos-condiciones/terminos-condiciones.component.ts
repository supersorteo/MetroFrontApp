import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { hasAcceptedTerms, TERMS_VERSION, termsStorageKey } from '../../core/terms/terms.util';

@Component({
  selector: 'app-terminos-condiciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './terminos-condiciones.component.html',
  styleUrl: './terminos-condiciones.component.scss'
})
export class TerminosCondicionesComponent implements OnInit, OnChanges {
  @Input() userCode = '';

  readonly termsVersion = TERMS_VERSION;
  accepted = false;
  visible = false;
  termsHtml = '';

  constructor(private readonly http: HttpClient) {}

  private readonly termsMarkdown = String.raw`# Términos y Condiciones de WWW.METROAPP.SITE

## 1. CONDICIONES GENERALES Y ACEPTACIÓN

Esta página establece las "Condiciones Generales" que regulan el uso de los contenidos y servicios que integran el Portal web www.metroapp.site (en adelante, el "Portal Web"). Por favor, lea esta página atentamente. SI NO ACEPTA ESTAS CONDICIONES GENERALES, NO UTILICE ESTE PORTAL WEB. CUALQUIER PERSONA QUE NO ACEPTE ESTAS CONDICIONES GENERALES, LAS CUALES TIENEN CARÁCTER OBLIGATORIO Y VINCULANTE, DEBERÁ ABSTENERSE DE UTILIZAR EL PORTAL Y/O LOS SERVICIOS OFRECIDOS.

Si el Usuario utiliza el Portal Web, se entenderá que ha aceptado plenamente y sin reservas las Condiciones Generales que estén vigentes en el momento de acceso. El Usuario se obliga a cumplir con todas las disposiciones contenidas en estas Condiciones Generales, bajo las leyes aplicables, estatutos, reglamentos y regulaciones concernientes al uso del Portal Web. El administrador del Portal Web se reserva el derecho de revisar estas Condiciones Generales en cualquier momento, actualizando y/o modificando esta página.

## 2. ACCESO AL PORTAL WEB. USO DEL MATERIAL

### 2.1. Acceso y utilización del Portal web. Autorización de uso de marca/logo.

El acceso y utilización del Portal web no exige la previa suscripción o registro del Usuario. Sin perjuicio de ello, la utilización de algunos servicios requiere la suscripción o registro del Usuario y/o el pago de un precio, conforme a las condiciones particulares aplicables. Todo Usuario registrado autoriza expresamente a incorporar en el Portal web, a exclusivo criterio de este último, el logo/marca de titularidad del Usuario que haya contratado al menos uno de los servicios provistos a través de dicho Portal web, con el único fin de referenciar a dicho Usuario como cliente del Portal web.

### 2.2. Utilización del Portal web.

El Usuario se compromete a utilizar el Portal web de conformidad con la ley, estas Condiciones Generales, las Condiciones Particulares aplicables, la moral y las buenas costumbres generalmente aceptadas y el orden público. El Usuario deberá abstenerse de utilizar el Portal web con fines ilícitos, contrarios a estas Condiciones, lesivos de los derechos e intereses de terceros o que puedan dañar, inutilizar, sobrecargar o deteriorar el Portal web.

### 2.3. Utilización del contenido del Portal web.

Se autoriza a visualizar y/o descargar una única copia de los contenidos del Portal web exclusivamente para uso personal y no comercial. Los textos, gráficos, imágenes, logos, iconos, software y cualquier otro material están protegidos por la legislación sobre propiedad industrial e intelectual. Todo el Contenido es propiedad del administrador del Portal Web, de sociedades vinculadas, de sus proveedores de contenido o de sus clientes.

No podrá vender, modificar, reproducir, exhibir, representar públicamente, distribuir ni utilizar el Contenido con fines comerciales o de difusión. Está prohibido utilizarlo en cualquier otro sitio web o entorno informático para cualquier fin. Tampoco podrá copiar ni adaptar el código fuente creado para generar las páginas del Portal web.

### 2.4. Uso permitido del Sitio.

No está permitido transmitir, distribuir, almacenar o destruir material violando leyes o regulaciones, infringiendo derechos de propiedad intelectual, violando la confidencialidad o imagen pública de terceros, o que sea difamatorio, obsceno, amenazador, injurioso u ofensivo.

Se prohíbe violar o intentar violar la seguridad del Portal web, acceder a datos no destinados al Usuario, probar vulnerabilidades sin autorización, impedir el servicio, enviar virus o comunicaciones no solicitadas, falsificar información de red o realizar cualquier actividad que afecte el funcionamiento del sistema. Las violaciones de seguridad pueden generar responsabilidades civiles o penales.

### 2.5. Usos prohibidos.

El Usuario acepta no utilizar el Portal web para anunciar datos falsos o inexactos; publicar oportunidades que requieran pagos o reclutamiento indebido; borrar o revisar material de terceros; impedir el funcionamiento del Portal web; imponer una carga desproporcionada sobre su infraestructura; revelar o compartir contraseñas; utilizar robots, spiders u otros mecanismos no autorizados; ni intentar descifrar, descompilar u obtener el código fuente.

El administrador del Portal Web se reserva el derecho de dar de baja publicaciones que no cumplan estas Condiciones y de suspender o cancelar usuarios que las incumplan o incurran en conductas dolosas o fraudulentas.

## 3. DATOS PERSONALES DEL USUARIO. REGISTRO EN EL PORTAL WEB

Cuando se registre, se le podrá solicitar información que incluirá una dirección válida de correo electrónico. El Usuario reconoce y acepta que el administrador del Portal Web puede revelar a terceros, de forma anónima, determinados datos contenidos en su registro. No se revelarán su nombre, correo electrónico o teléfono sin consentimiento previo, salvo cuando sea necesario para cumplir leyes o procedimientos legales.

El Usuario es responsable de mantener la confidencialidad de sus datos y contraseña, así como de todos los usos de su registro. Deberá notificar inmediatamente cualquier uso no autorizado.

## 4. OBLIGACIONES DEL USUARIO

El Usuario es responsable de sus comunicaciones y publicaciones. Acepta no publicar material que infrinja derechos de terceros, revele secretos comerciales, sea obsceno, difamatorio, amenazante, acosador, injurioso o denigrante; no suplantar personas; y no enviar virus, troyanos, gusanos, bombas de tiempo u otras rutinas destinadas a dañar o interferir sistemas, datos o información.

El administrador del Portal Web no garantiza la licitud, exactitud o fiabilidad de las comunicaciones de los Usuarios. El Usuario utiliza los contenidos y datos publicados por terceros bajo su propia responsabilidad.

El administrador podrá impedir el acceso de Usuarios que violen estas Condiciones o la ley, y podrá retirar comunicaciones injuriosas, ilegales o contrarias a la moral y las buenas costumbres.

Al remitir contenido a un área pública o privada del Portal web, el Usuario concede al administrador y sus empresas vinculadas una licencia gratuita, perpetua, irrevocable, cedible y no exclusiva para usar, reproducir, modificar, adaptar, publicar, traducir, distribuir, comunicar, representar o exhibir dicho contenido en cualquier medio, sin perjuicio de los derechos que conserve su titular.

## 5. UTILIZACIÓN DEL PORTAL WEB, SERVICIOS Y CONTENIDOS

El Usuario acepta voluntariamente que el uso del Portal web, sus servicios y sus Contenidos tiene lugar bajo su única y exclusiva responsabilidad.

## 6. EXCLUSIÓN DE GARANTÍAS Y RESPONSABILIDAD

El Usuario asume los riesgos asociados al trato con otros Usuarios y reconoce que el Portal web no puede confirmar la identidad de cada Usuario ni controlar su comportamiento. La información de terceros puede ser ofensiva, perjudicial, inexacta o fraudulenta.

El Contenido puede contener imprecisiones o errores. El administrador del Portal Web no garantiza su exactitud, veracidad, exhaustividad o actualidad. Los cambios en el Portal web podrán realizarse periódicamente y en cualquier momento.

El administrador no garantiza la disponibilidad, continuidad, utilidad, infalibilidad, privacidad o seguridad del Portal web y sus servicios, ni que el sistema o servidor estén libres de errores, virus u otros mecanismos lesivos. El Portal web y el Contenido se suministran tal como están, sin garantías explícitas o implícitas, dentro de la mayor amplitud legal.

En ningún caso el administrador, las sociedades vinculadas, proveedores o terceros mencionados serán responsables por daños incidentales, derivados, lucro cesante, pérdida de datos o interrupción del negocio que resulten del uso o imposibilidad de uso del Portal web, aun cuando hubieran sido advertidos de esa posibilidad.

## 7. VÍNCULOS A OTROS SITIOS

El Portal web puede contener vínculos a sitios de terceros. Se proporcionan únicamente por comodidad y no implican respaldo de sus contenidos. El administrador no es responsable por esos sitios ni por su exactitud. El acceso a sitios vinculados se realiza bajo responsabilidad del Usuario.

## 8. CESIÓN O USO COMERCIAL NO AUTORIZADO

El Usuario acepta no ceder sus derechos u obligaciones bajo estas Condiciones ni realizar usos comerciales no autorizados del Portal web. Se compromete a utilizar el Portal web, el Contenido y los Servicios conforme a la ley, estas Condiciones y de forma correcta y diligente.

## 9. CANCELACIÓN

El administrador del Portal Web se reserva el derecho de emplear todos los medios legales a su alcance, incluyendo la supresión de publicaciones y la cancelación inmediata del registro, imposibilitando el acceso al Portal web o a cualquier otro servicio, si el Usuario infringe estas Condiciones o si no es posible verificar la autenticidad de la información suministrada.

## 10. INDEMNIZACIÓN

El Usuario acepta defender, indemnizar y mantener indemnes al administrador del Portal Web, las sociedades vinculadas, sus directivos, empleados y representantes frente a cualquier cargo, acción o demanda, incluidos gastos legales razonables, que resulten de su uso del Portal web, los Contenidos y los Servicios o del incumplimiento de estas Condiciones.

## 11. GENERAL

El administrador no asegura que los Contenidos puedan ser visualizados o descargados legítimamente fuera de Argentina. Si el Usuario accede desde otro país, lo hace bajo su responsabilidad y debe cumplir las leyes de su jurisdicción.

Estas Condiciones se rigen por las leyes de la República Argentina. Cualquier demanda derivada se someterá a la jurisdicción de los juzgados y tribunales de la Ciudad de Buenos Aires, salvo que por imperativo legal corresponda otro fuero. Si alguna cláusula fuera declarada nula, ello no afectará la validez de las restantes. Estas Condiciones constituyen el acuerdo entre el Usuario y el administrador respecto del uso del Portal web. Los cambios requieren la publicación de un texto revisado.

## 12. DURACIÓN Y TERMINACIÓN

La prestación del servicio del Portal web y sus Contenidos y Servicios tiene, en principio, duración indefinida. El administrador podrá terminar o suspender la prestación del servicio o de cualquiera de sus Contenidos y Servicios en cualquier momento y, cuando sea razonablemente posible, comunicará previamente dicha terminación o suspensión.

## 13. TÉRMINOS DE USO ADICIONALES

Ciertas áreas del Portal web pueden estar sujetas a términos y condiciones adicionales. Al utilizar esas áreas, o cualquier parte de ellas, el Usuario acepta cumplir los términos adicionales aplicables.`;

  ngOnInit(): void {
    this.termsHtml = this.renderTerms(this.termsMarkdown);
    this.http.get('assets/terminos-condiciones.md', { responseType: 'text' }).subscribe({
      next: content => this.termsHtml = this.renderTerms(content),
      error: () => { /* Se conserva el contenido incluido como respaldo. */ }
    });
    this.updateVisibility();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userCode'] && !changes['userCode'].firstChange) {
      this.updateVisibility();
    }
  }

  aceptar(): void {
    if (!this.accepted || !this.userCode.trim()) return;
    localStorage.setItem(this.storageKey(), this.termsVersion);
    this.visible = false;
  }

  private updateVisibility(): void {
    this.visible = !hasAcceptedTerms(this.userCode);
  }

  private storageKey(): string {
    return termsStorageKey(this.userCode);
  }

  private renderTerms(markdown: string): string {
    const escapeHtml = (value: string): string => value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    return markdown.split(/\n{2,}/).map(block => {
      const clean = block.trim()
        .replace(/\\([.!-])/g, '$1')
        .replace(/\*\*/g, '');
      const heading = clean.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        return `<h${level}>${escapeHtml(heading[2])}</h${level}>`;
      }
      if (clean.split('\n').every(line => line.trim().startsWith('- '))) {
        return `<ul>${clean.split('\n').map(line => `<li>${escapeHtml(line.trim().slice(2))}</li>`).join('')}</ul>`;
      }
      return `<p>${escapeHtml(clean).replace(/\n/g, '<br>')}</p>`;
    }).join('');
  }

  @HostListener('document:keydown.escape', ['$event'])
  bloquearEscape(event: Event): void {
    if (this.visible) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
