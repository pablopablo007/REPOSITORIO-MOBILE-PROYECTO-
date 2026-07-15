import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RegistroUsuario from './RegistroUsuario';

describe('RegistroUsuario', () => {
  it('Prueba 1: Verificar que aparece el título "Registro de Usuario"', () => {
    const { getByText } = render(<RegistroUsuario />);
    expect(getByText('Registro de Usuario')).toBeTruthy();
  });

  it('Prueba 2: Verificar que existe el campo con placeholder "Ingrese su nombre"', () => {
    const { getByPlaceholderText } = render(<RegistroUsuario />);
    expect(getByPlaceholderText('Ingrese su nombre')).toBeTruthy();
  });

  it('Prueba 3: Verificar que el botón "Registrar" está presente en pantalla', () => {
    const { getByText } = render(<RegistroUsuario />);
    expect(getByText('Registrar')).toBeTruthy();
  });

  it('Prueba 4: Simular escritura en el campo nombre usando fireEvent.changeText()', () => {
    const { getByPlaceholderText } = render(<RegistroUsuario />);
    const inputNombre = getByPlaceholderText('Ingrese su nombre');
    
    fireEvent.changeText(inputNombre, 'Juan Pérez');
    
    // Verificamos que el valor cambió
    expect(inputNombre.props.value).toBe('Juan Pérez');
  });

  it('Prueba 5: Simular presión del botón usando fireEvent.press() sobre "Registrar" y verificar que aparece el texto "Usuario registrado correctamente"', () => {
    const { getByText } = render(<RegistroUsuario />);
    
    const botonRegistrar = getByText('Registrar');
    fireEvent.press(botonRegistrar);
    
    expect(getByText('Usuario registrado correctamente')).toBeTruthy();
  });
});
