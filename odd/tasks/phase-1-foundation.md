# MiCondominioDigital — Phase 1 Foundation
Feature: authentication, multi-tenancy, plans, entitlements, and desktop bootstrap.
Scope: establish the backend foundation for a freemium SaaS tenant model before feature modules.

## Specs

1. **S1 — Tenant model**
   - User requirement: "cada condominio tiene sus datos completamente aislados (tenant_id en todas las tablas + validación en cada consulta)".
   - User requirement: "un tenant por condominio".

2. **S2 — Authentication and security**
   - User requirement: "autenticación segura (JWT con refresh tokens o sesiones seguras, hash con Argon2/bcrypt)".
   - User requirement: "RBAC y aislamiento estricto por tenant".

3. **S3 — Plans and subscriptions**
   - User requirement: "debe existir un sistema de planes ... configurables desde base de datos, no hardcodeados".
   - Decision: subscription belongs to the condominium tenant.

4. **S4 — Desktop entitlement**
   - User requirement: "el desktop sea freemium osea que tenga unas funcionalidades, y que para seguir usandolo tenga que pagar".
   - Decision: free mode is a limited demo; paid mode unlocks configured capabilities.
   - Decision: expired or failed payment transitions the desktop to read-only mode.
   - Decision: MVP has no practical device activation limit.

5. **S5 — Verification**
   - User requirement: "Pruebas unitarias e integración en la lógica crítica (autenticación, aislamiento multi-tenant, permisos, herramientas de la IA)".
   - Phase 1 must include focused authentication, tenant isolation, and entitlement tests.

## Tasks

- T1 [S1-S2] Bootstrap monorepo and API foundation — route: parent inline — commit: pending
- T2 [S1-S2] Implement authentication, tenant context, memberships, and RBAC — route: worker — commit: pending
- T3 [S3-S4] Implement plans, subscriptions, entitlements, and desktop bootstrap — route: worker — commit: pending
- T4 [S5] Add integration tests for authentication, isolation, permissions, and plan gating — route: verifier/parent — commit: pending

## Log

- L1: "Listo empezemos, esta bien empezar ya?"
- L2: "Este es el repo del proyecto: https://github.com/JARLOK46/MiCondominioDigital.git Esta vacio"
- L3: "tambien como sabra el desktop que una persona tiene una cuenta en la pagina y es pagada, tambien quiero que el desktop sea freemium osea que tenga unas funcionalidades, y que para seguir usandolo tenga que pagar"
- L4: Confirmed decisions: one tenant per condominium; desktop free mode is demo/data-limited; expired or failed payment is read-only; unlimited practical device activations in MVP; recurrent payments are abstracted from the provider; 30-day surveillance retention.
- L5: User constraint: "Cada cambio que hagas, siempre lo debes hacer commit y push".
