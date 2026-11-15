/** Validation accessible et envoi du formulaire de devis. */
export function initContactForm(): void {
    const form = document.querySelector<HTMLFormElement>('.contact-form');
    if (!form) return;
    const status = form.querySelector<HTMLElement>('.form-status')!;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;

    const setError = (field: HTMLInputElement | HTMLTextAreaElement, message: string) => {
        const id = `${field.id}-error`;
        let error = document.getElementById(id);
        if (!message) {
            error?.remove();
            field.removeAttribute('aria-invalid');
            field.setAttribute('aria-describedby', (field.getAttribute('aria-describedby') ?? '').replace(id, '').trim());
            return;
        }
        if (!error) {
            error = document.createElement('p');
            error.id = id;
            error.className = 'field-error';
            field.insertAdjacentElement('afterend', error);
            field.setAttribute('aria-describedby', `${field.getAttribute('aria-describedby') ?? ''} ${id}`.trim());
        }
        error.textContent = message;
        field.setAttribute('aria-invalid', 'true');
    };

    const validate = (): boolean => {
        const name = form.elements.namedItem('nom') as HTMLInputElement;
        const contact = form.elements.namedItem('contact') as HTMLInputElement;
        const message = form.elements.namedItem('message') as HTMLTextAreaElement;
        const value = contact.value.trim();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        const isPhone = /^[+()\d\s.-]{10,}$/.test(value);

        setError(name, name.value.trim() ? '' : 'Indiquez votre nom.');
        setError(contact, value ? (isEmail || isPhone ? '' : 'Indiquez un e-mail ou un numéro de téléphone valide.') : 'Indiquez un e-mail ou un téléphone.');
        setError(message, message.value.trim() ? '' : 'Décrivez votre projet en quelques mots.');

        const firstInvalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
        firstInvalid?.focus();
        return !firstInvalid;
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validate()) {
            status.textContent = 'Merci de corriger les champs signalés.';
            return;
        }

        const data = new FormData(form);
        const endpoint = form.dataset.endpoint;

        if (!endpoint) {
            // Pas de service d'envoi configuré : on prépare l'e-mail dans la messagerie du visiteur.
            const type = String(data.get('type') || 'meuble');
            const subject = `Demande de devis : ${type === 'meuble' ? 'meuble sur mesure' : type.toLowerCase()}`;
            const body = [
                `Nom : ${data.get('nom')}`,
                `Contact : ${data.get('contact')}`,
                `Type de meuble : ${data.get('type') || 'non précisé'}`,
                '',
                String(data.get('message')),
            ].join('\n');
            const params = new URLSearchParams({ subject, body }).toString().replace(/\+/g, '%20');
            window.location.href = `mailto:${form.dataset.user}@${form.dataset.domain}?${params}`;
            status.textContent = 'Votre messagerie s’ouvre avec votre demande préremplie. Il ne reste qu’à l’envoyer.';
            return;
        }

        submit.disabled = true;
        status.textContent = 'Envoi en cours…';
        try {
            const response = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
            if (!response.ok) throw new Error(String(response.status));
            form.reset();
            status.textContent = 'Merci ! Votre demande est bien partie, nous vous recontactons rapidement.';
        } catch {
            status.textContent = 'L’envoi a échoué. Vous pouvez nous appeler ou nous écrire directement (coordonnées ci-dessous).';
        } finally {
            submit.disabled = false;
        }
    });
}
