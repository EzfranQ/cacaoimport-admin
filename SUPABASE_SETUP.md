# Configuración de Supabase

Este proyecto utiliza Supabase para la autenticación. Sigue estos pasos para configurarlo:

## 1. Crear un proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Espera a que el proyecto se inicialice

## 2. Obtener las credenciales

1. En tu proyecto de Supabase, ve a **Settings** > **API**
2. Copia los siguientes valores:
   - **Project URL** (URL del proyecto)
   - **anon public** key (Clave pública anónima)

## 3. Configurar las variables de entorno

1. Abre el archivo `.env` en la raíz del proyecto
2. Reemplaza los valores placeholder con tus credenciales reales:

```env
VITE_SUPABASE_URL=https://tu-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-aqui
```

## 4. Configurar la autenticación en Supabase

1. En tu proyecto de Supabase, ve a **Authentication** > **Settings**
2. En **Site URL**, agrega: `http://localhost:5174`
3. En **Redirect URLs**, agrega: `http://localhost:5174/admin`

## 5. Crear usuarios de prueba

Puedes crear usuarios de prueba de dos formas:

### Opción A: Desde el dashboard de Supabase
1. Ve a **Authentication** > **Users**
2. Haz clic en **Add user**
3. Ingresa email y contraseña

### Opción B: Usando el formulario de registro
1. Modifica temporalmente el componente de login para incluir un enlace de registro
2. O crea una página de registro separada

## 6. Reiniciar el servidor de desarrollo

Después de configurar las variables de entorno:

```bash
npm run dev
```

## Funcionalidades implementadas

- ✅ Contexto de autenticación con Supabase
- ✅ Login con email y contraseña
- ✅ Logout
- ✅ Rutas protegidas
- ✅ Persistencia de sesión
- ✅ Estados de carga y error
- ✅ Redirección automática

## Estructura del código

- `src/shared/contexts/contextAuth.tsx` - Contexto de autenticación
- `src/app/libs/supabase/index.ts` - Cliente de Supabase
- `src/shared/components/ProtectedRoute.tsx` - Componente de rutas protegidas
- `src/modules/auth/pages/login.tsx` - Página de login
- `src/shared/layout/adminLayout/components/nav-user.tsx` - Componente de usuario en la navegación