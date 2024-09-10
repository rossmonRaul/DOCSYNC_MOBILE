import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, ImageBackground, TextInput, TouchableOpacity, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { styles } from '../../../../styles/global-styles.styles';
import DropdownComponent from '../../../../components/Dropdown/Dropwdown';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ScreenProps } from '../../../../constants';
import { useAuth } from '../../../../hooks/useAuth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BackButtonComponent } from '../../../../components/BackButton/BackButton';
import BottomNavBar from '../../../../components/BottomNavbar/BottomNavbar';
import { Ionicons } from '@expo/vector-icons'
import { RelacionFincaParcela } from '../../../../interfaces/userDataInterface';
import { ObtenerUsuariosAsignadosPorIdentificacion } from '../../../../servicios/ServicioUsuario';
import { ObtenerFincas } from '../../../../servicios/ServicioFinca';
import { ObtenerParcelas } from '../../../../servicios/ServicioParcela';
import { DropdownData } from '../../../../hooks/useFetchDropDownData';
import { UseFetchDropdownDataProps } from '../../../../hooks/useFetchDropDownData';
import { FincaInterface } from '../../../../interfaces/empresaInterfaces';
import { ParcelaInterface } from '../../../../interfaces/empresaInterfaces';
import { useFetchDropdownData } from '../../../../hooks/useFetchDropDownData';;
import { ModificarRegistroSeguimientoCondicionesMeteorologicas } from '../../../../servicios/ServicioClima';
import { CambiarEstadoRegistroCondicionesMeteorologicas } from '../../../../servicios/ServicioClima';
import { formatSpanishDate, formatFecha } from '../../../../utils/dateFortmatter';
import DateTimePicker from '@react-native-community/datetimepicker';

interface RouteParams {
    idRegistroCondicionesMeteorologicasClimaticas: string,
    idFinca: string,
    idParcela: string,
    fecha: string,
    humedad: string,
    hora: string,
    temperatura: string,
    humedadAcumulada: string,
    temperaturaAcumulada: string,
    estado: string
}

export const ModificarCondicionesMeterologicasClimaticasScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { userData } = useAuth();

    const route = useRoute();

    const { idRegistroCondicionesMeteorologicasClimaticas,
        idFinca,
        idParcela,
        fecha,
        hora,
        humedad,
        temperatura,
        humedadAcumulada,
        temperaturaAcumulada,
        estado
    } = route.params as RouteParams;

    const [empresa, setEmpresa] = useState(userData.idEmpresa);
    const [finca, setFinca] = useState(null);
    const [parcela, setParcela] = useState(null);

    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [periodData, setPeriodData] = useState('');
    const [period, setPeriod] = useState('');
    const [fincaDataOriginal, setFincaDataOriginal] = useState<DropdownData[]>([]);
    const [parcelaDataOriginal, setParcelaDataOriginal] = useState<DropdownData[]>([]);
    const [fincaDataSort, setFincaDataSort] = useState<DropdownData[]>([]);
    const [parcelaDataSort, setParcelaDataSort] = useState<DropdownData[]>([]);
    const [handleEmpresaCalled, setHandleEmpresaCalled] = useState(false);


    const [fincas, setFincas] = useState<{ idFinca: number; nombreFinca?: string }[] | []>([]);
    const [parcelas, setParcelas] = useState<{ idFinca: number; idParcela: number; nombre: string }[] | []>([]);
    const [parcelasFiltradas, setParcelasFiltradas] = useState<{ idParcela: number; nombre: string }[] | []>([]);
    const [selectedFinca, setSelectedFinca] = useState<string | null>(null);
    const [selectedParcela, setSelectedParcela] = useState<string | null>(null);

    const [showFecha, setShowFecha] = useState(false);
    const [showPickerTiempoCosecha, setShowPickerTiempoCosecha] = useState(false);

    const [dateFecha, setDateFecha] = useState(new Date())
    const [dateTiempoCosecha, setDateTiempoCosecha] = useState(new Date())

    const [isSecondFormVisible, setSecondFormVisible] = useState(false);


    const handleCheckBoxChange = (value, setState) => {
        setState(value);
    };
    //  Se define un estado para almacenar los datos del formulario
    const [formulario, setFormulario] = useState({
        idRegistroCondicionesMeteorologicasClimaticas: idRegistroCondicionesMeteorologicasClimaticas,
        idFinca: idFinca || '',
        idParcela: idParcela || '',
        identificacionUsuario: userData.identificacion,
        fecha: fecha || '',
        hora: hora || '',
        humedad: humedad || '',
        temperatura: temperatura || '',
        humedadAcumulada: humedadAcumulada || '',
        temperaturaAcumulada: temperaturaAcumulada || '',
    });

    //  Esta es una función para actualizar el estado del formulario
    const updateFormulario = (key: string, value: string) => {
        setFormulario(prevState => ({
            ...prevState,
            [key]: value
        }));
    };
    const extractTime = (timeString) => {
        const [time, periodD] = timeString.split(' '); // Dividir la cadena por espacio en hora y período
        let [hours, minutes] = time.split(':'); // Dividir la hora por los dos puntos en horas y minutos

        // Verifica si la hora comienza con '0' y convertirte en 'n'
        if (hours.startsWith('0')) {
            hours = hours.substring(1);
        }

        setHours(hours);
        setMinutes(minutes);
        setPeriod(periodD);
    };

    // Llamada a la función extractTime con la cadena de hora
    useEffect(() => {
        const timeString = hora; // Aquí deberías tener tu cadena de tiempo proveniente de algún lugar, como props o un API
        extractTime(timeString);
    }, []);
    // Se defina una función para manejar el modificar cuando le da al boton de guardar
    const handleModify = async () => {

        const temperaturaRegex = /^-?\d+(\.\d+)?$/;
        const humedadRegex = /^\d+$/;
        if (formulario.temperaturaAcumulada.toString().trim() === '') {
            alert('Por favor ingrese la temperatura.');
            return
        }
        if (!temperaturaRegex.test(formulario.temperaturaAcumulada.toString().trim())) {
            alert('Por favor ingrese una temperatura válida (permitiendo decimales con punto).');
            return
        }
        if (formulario.humedadAcumulada.toString().trim() === '') {
            alert('Por favor ingrese la humedad.');
            return
        }
        if (!humedadRegex.test(formulario.humedadAcumulada.toString().trim())) {
            alert('Por favor ingrese una humedad válida (números enteros).');
            return
        }

        //  Se crea un objeto con los datos del formulario para mandarlo por la API con formato JSON
        const formData = {
            idRegistroCondicionesMeteorologicasClimaticas: idRegistroCondicionesMeteorologicasClimaticas,
            idFinca: formulario.idFinca,
            idParcela: formulario.idParcela,
            identificacionUsuario: userData.identificacion,
            fecha: formatFecha(formulario.fecha),
            hora: `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')} ${period}`,
            humedad: formulario.humedad,
            temperatura: formulario.temperatura,
            humedadAcumulada: formulario.humedadAcumulada,
            temperaturaAcumulada: formulario.temperaturaAcumulada,
        };

        //  Se ejecuta el servicio de modificar el registro condiciones meterológicas y climáticas
        const responseInsert = await ModificarRegistroSeguimientoCondicionesMeteorologicas(formData);
        //  Se muestra una alerta de éxito o error según la respuesta obtenida
        if (responseInsert.indicador === 1) {
            Alert.alert('¡Se modifico el registro condiciones meterológicas y climáticas!', '', [
                {
                    text: 'OK',
                    onPress: () => {
                        navigation.navigate(ScreenProps.AdminWeather.screenName as never);
                    },
                },
            ]);
        } else {
            alert('!Oops! Parece que algo salió mal')
        }
    };

    useEffect(() => {
        const obtenerDatosIniciales = async () => {
            // Lógica para obtener datos desde la API
            const formData = { identificacion: userData.identificacion };

            try {
                const datosInicialesObtenidos: RelacionFincaParcela[] = await ObtenerUsuariosAsignadosPorIdentificacion(formData);

                const fincasUnicas = Array.from(new Set(datosInicialesObtenidos
                    .filter(item => item !== undefined)
                    .map(item => item!.idFinca)))
                    .map(idFinca => {
                        const relacion = datosInicialesObtenidos.find(item => item?.idFinca === idFinca);
                        const nombreFinca = relacion ? relacion.nombreFinca : ''; // Verificamos si el objeto no es undefined
                        return { idFinca, nombreFinca };
                    });

                setFincas(fincasUnicas);

                const parcelasUnicas = datosInicialesObtenidos.map(item => ({
                    idFinca: item.idFinca,
                    idParcela: item.idParcela,
                    nombre: item.nombreParcela,
                }));

                setParcelas(parcelasUnicas);

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        obtenerDatosIniciales();
    }, []);
    useEffect(() => {
        // Buscar la finca correspondiente, esto se hace para cargar las parcelas que se necesitan en dropdown porque
        // el monitoreo de eficiencia de riego ya tiene una finca asignada
        const fincaInicial = fincas.find(finca => finca.idFinca === parseInt(idFinca));

        // Establecer el nombre de la finca inicial como selectedFinca
        setSelectedFinca(fincaInicial?.nombreFinca || null);

        //obtener las parcelas de la finca que trae el fertilizantes
        const ObtenerParcelasIniciales = async () => {
            try {

                const parcelasFiltradas = parcelas.filter(item => item.idFinca === parseInt(idFinca));

                setParcelasFiltradas(parcelasFiltradas)
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
        ObtenerParcelasIniciales();
    }, [idFinca, finca, fincas]);
    useEffect(() => {
        // Buscar la parcela correspondiente
        const parcelaInicial = parcelas.find(parcela => parcela.idParcela === parseInt(idParcela));

        // Establecer el nombre de la parcela inicial como selectedFinca
        setSelectedParcela(parcelaInicial?.nombre || null);
    }, [idParcela, parcelas]);

    const validateFirstForm = () => {
        let isValid = true;

        const temperaturaRegex = /^-?\d+(\.\d+)?$/;
        const humedadRegex = /^\d+$/;

        if (formulario.fecha.trim() === '') {
            isValid = false;
            alert('La fecha es requerida.');
            return isValid;
        }
        if (hours === '' && minutes === '') {
            isValid = false;
            alert('La hora es requerida.');
            return isValid;
        }
        if (formulario.temperatura.toString().trim() === '') {
            isValid = false;
            alert('La temperatura es requerida.');
            return isValid;
        }
        if (!temperaturaRegex.test(formulario.temperatura.toString().toString().trim())) {
            isValid = false;
            alert('Por favor ingrese una temperatura válida (permitiendo decimales con punto).');
            return isValid;
        }
        if (period === '') {
            isValid = false;
            alert('El periodo es requerido.');
            return isValid;
        }
        if (formulario.humedad.toString().trim() === '') {
            isValid = false;
            alert('La humedad es requerida.');
            return isValid;
        }
        if (!humedadRegex.test(formulario.humedad.toString().trim())) {
            isValid = false;
            alert('Por favor ingrese una humedad válida (números enteros).');
            return isValid;
        }
        if (parseInt(formulario.humedad) < 0 || parseInt(formulario.humedad) > 100) {
            isValid = false;
            alert('La humedad tiene que ser un número entre 0 y 100.');
            return isValid;
        }
        if (parseInt(formulario.humedadAcumulada) < 0) {
            isValid = false;
            alert('La humedad acumulada no puede ser un número negativo.');
            return isValid;
        }
        if (formulario.temperaturaAcumulada.toString().trim() === '') {
            isValid = false;
            alert('La temperatura acumulada es requerida.');
            return isValid;
        }

        return isValid;
    };


    const handleChangeAccess = async () => {
        //  Se crea un objeto con los datos del formulario para mandarlo por la API con formato JSON
        const formData = {
            idRegistroCondicionesMeteorologicasClimaticas: idRegistroCondicionesMeteorologicasClimaticas,
        };


        //  Se muestra una alerta con opción de aceptar o cancelar
        Alert.alert(
            'Confirmar cambio de estado',
            '¿Estás seguro de que deseas cambiar el estado del registro condiciones meterológicas y climáticas?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Aceptar',
                    onPress: async () => {
                        //  Se inserta el identificacion en la base de datos
                        const responseInsert = await CambiarEstadoRegistroCondicionesMeteorologicas(formData);
                        // Se ejecuta el cambio de estado
                        if (responseInsert.indicador === 1) {
                            Alert.alert(
                                '¡Se actualizó el estado del registro condiciones meterológicas y climáticas!',
                                '',
                                [
                                    {
                                        text: 'OK',
                                        onPress: () => {
                                            navigation.navigate(
                                                ScreenProps.AdminWeather.screenName
                                            );
                                        },
                                    },
                                ]
                            );
                        } else {
                            alert('¡Oops! Parece que algo salió mal');
                        }
                    },
                },
            ],
            { cancelable: false }
        );
    };

    const handleValueEmpresa = (idEmpresa: number) => {
        setEmpresa(idEmpresa);
        let fincaSort = fincaDataOriginal.filter(item => item.id === userData.idEmpresa.toString());
        setFincaDataSort(fincaSort);
        setFinca(null);
        setParcela(null);
    }
    useEffect(() => {
        if (!handleEmpresaCalled && fincaDataOriginal.length > 0) {
            handleValueEmpresa(userData.idEmpresa);
            setHandleEmpresaCalled(true);
        }
    }, [userData.idEmpresa, fincaDataOriginal, handleEmpresaCalled]);

    const obtenerParcelasPorFinca = async (fincaId: number) => {
        try {
            const parcelasFiltradas = parcelas.filter(item => item.idFinca === fincaId);

            setParcelasFiltradas(parcelasFiltradas);
        } catch (error) {
            console.error('Error fetching parcelas:', error);
        }
    };
    const handleFincaChange = (item: { label: string; value: string }) => {
        const fincaId = parseInt(item.value, 10);
        setSelectedFinca(item.value);
        //se acctualiza el id parcela para que seleccione otra vez la parcela
        updateFormulario('idParcela', '');
        setSelectedParcela('Seleccione una Parcela')
        //se obtienen las parcelas de la finca
        obtenerParcelasPorFinca(fincaId);
    };
    const obtenerFincaProps: UseFetchDropdownDataProps<FincaInterface> = {
        fetchDataFunction: ObtenerFincas,
        setDataFunction: setFincaDataOriginal,
        labelKey: 'nombre',
        valueKey: 'idFinca',
        idKey: 'idEmpresa',
    };

    const obtenerParcelaProps: UseFetchDropdownDataProps<ParcelaInterface> = {
        fetchDataFunction: ObtenerParcelas,
        setDataFunction: setParcelaDataOriginal,
        labelKey: 'nombre',
        valueKey: 'idParcela',
        idKey: 'idFinca',
    };
    /*  Se utiliza el hook useFetchDropdownData para obtener
        y gestionar los datos de fincas y parcelas*/
    const onChange = (event, selectedDate, picker) => {
        const currentDate = selectedDate || new Date(); // Selecciona la fecha actual si no hay ninguna seleccionada
        switch (picker) {
            case 'fecha':
                setShowFecha(Platform.OS === 'ios');
                setDateFecha(currentDate);
                break;
            default:
                break;
        }

        if (event.type === 'set') {
            const formattedDate = formatSpanishDate(currentDate);
            updateFormulario(picker === 'fecha' ? 'fecha' : '', formattedDate);
        }
    };
    const confirmIOSDate = (picker) => {
        switch (picker) {
            case 'fecha':
                setShowFecha(false);
                updateFormulario('fecha', formatSpanishDate(dateFecha));
                break;
            default:
                break;
        }
    };
    const toggleDatePicker = (picker) => {
        switch (picker) {
            case "fecha":
                setShowFecha(!showFecha);
                break;
            case "cosecha":
                setShowPickerTiempoCosecha(!showPickerTiempoCosecha);
                break;
            default:
                break;
        }
    };
    const handleHourChange = (text) => {
        const sanitizedText = text.replace(/[^0-9]/g, ''); // Eliminar cualquier carácter que no sea un número

        if (sanitizedText === '' || (parseInt(sanitizedText) >= 1 && parseInt(sanitizedText) <= 12)) {
            // Si el texto está vacío o está entre 1 y 12, actualizar el estado de las horas
            setHours(sanitizedText);
        }
    };

    const handleMinuteChange = (text) => {
        const sanitizedText = text.replace(/[^0-9]/g, ''); // Eliminar cualquier carácter que no sea un número

        if (sanitizedText === '' || (parseInt(sanitizedText) >= 0 && parseInt(sanitizedText) <= 59)) {
            // Si el texto está vacío o está entre 0 y 59, actualizar el estado de los minutos
            setMinutes(sanitizedText);
        }
    };

    const isValidTime = () => {
        if (parseInt(hours, 10) < 0 || parseInt(hours, 10) > 12 || parseInt(minutes, 10) < 0 || parseInt(minutes, 10) >= 60) {
            return false;
        }
        return true;
    };
    const dateTimeValues = [
        {
            label: 'AM', value: 'AM'
        },
        {

            label: 'PM', value: 'PM'
        }
    ]

    useFetchDropdownData(obtenerFincaProps);
    useFetchDropdownData(obtenerParcelaProps);
    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}

            >
                <ImageBackground
                    source={require('../../../../assets/images/siembros_imagen.jpg')}
                    style={styles.upperContainer}
                >
                </ImageBackground>
                <BackButtonComponent screenName={ScreenProps.ListWeatherClimateConditions.screenName} color={'#ffff'} />
                <View style={styles.lowerContainer}>
                    <ScrollView style={styles.rowContainer} showsVerticalScrollIndicator={false}>

                        <View>
                            <Text style={styles.createAccountText} >Seguimiento de las condiciones meteorológicas y climáticas</Text>
                        </View>

                        <View style={styles.formContainer}>
                            {!isSecondFormVisible ? (
                                <>
                                    <Text style={styles.formText} >Fecha</Text>
                                    {!showFecha && (
                                        <Pressable
                                            onPress={() => toggleDatePicker('fecha')}

                                        >
                                            <TextInput
                                                style={styles.input}
                                                placeholder='00/00/00'
                                                value={formulario.fecha}
                                                onChangeText={(text) => updateFormulario('fecha', text)}
                                                editable={false}
                                                onPressIn={() => toggleDatePicker('fecha')}
                                            />
                                        </Pressable>

                                    )}

                                    {showFecha && (
                                        <DateTimePicker
                                            mode="date"
                                            display='spinner'
                                            value={dateFecha}
                                            onChange={(event, selectedDate) => onChange(event, selectedDate, 'fecha')}
                                            style={styles.dateTimePicker}
                                            minimumDate={new Date('2015-1-2')}
                                        />
                                    )}
                                    {showFecha && Platform.OS === 'ios' && (
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                justifyContent: "space-around"
                                            }}
                                        >
                                            <TouchableOpacity style={[
                                                styles.buttonPicker,
                                                styles.pickerButton,
                                                { backgroundColor: "#11182711" },
                                            ]}
                                                onPress={toggleDatePicker}
                                            >

                                                <Text style={[
                                                    styles.buttonTextPicker,
                                                    { color: "#075985" }
                                                ]}>Cancelar</Text>

                                            </TouchableOpacity>
                                            <TouchableOpacity style={[
                                                styles.buttonPicker,
                                                styles.pickerButton,
                                                { backgroundColor: "#11182711" },
                                            ]}
                                                onPress={() => confirmIOSDate('fecha')}
                                            >

                                                <Text style={[
                                                    styles.buttonTextPicker,
                                                    { color: "#075985" }
                                                ]}>Confirmar</Text>

                                            </TouchableOpacity>

                                        </View>
                                    )}
                                    <Text style={styles.formText} >Hora</Text>
                                    <View style={{ flexDirection: 'row', gap: 25, alignItems: 'center' }} >
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 100,
                                            gap: 10,
                                            marginLeft: 40,
                                        }}>
                                            <TextInput
                                                style={[styles.input, { textAlign: 'center', fontSize: 20 }]}
                                                placeholder="HH"
                                                keyboardType="numeric"
                                                value={hours}
                                                onChangeText={(text) => handleHourChange(text)}
                                                maxLength={2}
                                            />
                                            <Text style={{ fontSize: 20, textAlign: 'center' }}>:</Text>
                                            <TextInput
                                                style={[styles.input, { textAlign: 'center', fontSize: 20 }]}
                                                placeholder="MM"
                                                keyboardType="numeric"
                                                value={minutes}
                                                onChangeText={(text) => handleMinuteChange(`${text}`)}
                                                maxLength={2}
                                            />
                                        </View>
                                        <View style={{ minWidth: 90, minHeight: 40 }}>
                                            <DropdownComponent
                                                placeholder="Periodo"
                                                data={dateTimeValues}
                                                value={period}
                                                iconName=''
                                                height={40}
                                                onChange={(value) => setPeriod(value.value)}
                                            />
                                        </View>

                                    </View>
                                    {!isValidTime() && <Text style={{ color: 'red' }}>Ingrese una hora válida</Text>}
                                    <Text style={styles.formText}>
                                        {`Hora seleccionada: ${hours.padStart(2, '0')}:${minutes.padStart(2, '0')} ${period}`}
                                    </Text>
                                    <Text style={styles.formText} >Temperatura (°C)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Temperatura"
                                        keyboardType="numeric"
                                        value={formulario.temperatura.toString()}
                                        onChangeText={(text) => updateFormulario('temperatura', text)}
                                        maxLength={10}
                                    />
                                    <Text style={styles.formText} >Humedad(%)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Humedad"
                                        keyboardType="numeric"
                                        value={formulario.humedad.toString()}
                                        onChangeText={(text) => updateFormulario('humedad', text)}
                                        maxLength={10}
                                    />


                                    <TouchableOpacity
                                        style={styles.button}
                                        onPress={async () => {
                                            const isValid = validateFirstForm();

                                            if (isValid) {
                                                setSecondFormVisible(true);
                                            }

                                        }}
                                    >
                                        <Text style={styles.buttonText}>Siguiente</Text>
                                    </TouchableOpacity>
                                </>

                            ) : (<>
                                <Text style={styles.formText} >Temperatura acumulada (°C)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Temperatura"
                                    keyboardType="numeric"
                                    value={formulario.temperaturaAcumulada.toString()}
                                    onChangeText={(text) => updateFormulario('temperaturaAcumulada', text)}
                                    maxLength={5}
                                />
                                <Text style={styles.formText} >Humedad acumulada(%)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Humedad"
                                    keyboardType="numeric"
                                    value={formulario.humedadAcumulada.toString()}
                                    onChangeText={(text) => updateFormulario('humedadAcumulada', text)}
                                    maxLength={3}
                                />
                                {empresa &&
                                    <DropdownComponent
                                        placeholder={selectedFinca ? selectedFinca : "Seleccionar Finca"}
                                        data={fincas.map(finca => ({ label: finca.nombreFinca, value: String(finca.idFinca) }))}
                                        value={selectedFinca}
                                        iconName="tree"
                                        selectedTextColor="#548256"
                                        iconColor="#548256"
                                        onChange={(selectedItem) => {
                                            // Manejar el cambio en la selección de la finca
                                            handleFincaChange(selectedItem);

                                            // Actualizar el formulario con la selección de la finca
                                            updateFormulario('idFinca', selectedItem.value);
                                        }}
                                    />
                                }
                                <DropdownComponent
                                    placeholder={selectedParcela ? selectedParcela : "Seleccionar Parcela"}
                                    data={parcelasFiltradas.map(parcela => ({ label: parcela.nombre, value: String(parcela.idParcela) }))}
                                    value={selectedParcela}
                                    iconName="pagelines"
                                    selectedTextColor="#548256"
                                    iconColor="#548256"
                                    onChange={(selectedItem) => {
                                        // Manejar el cambio en la selección de la parcela
                                        setSelectedParcela(selectedItem.value);

                                        // Actualizar el formulario con la selección de la parcela
                                        updateFormulario('idParcela', selectedItem.value);
                                    }}
                                />
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={() => {
                                        setSecondFormVisible(false);
                                    }}
                                >
                                    <View style={styles.buttonContent}>
                                        <Ionicons name="arrow-back-outline" size={20} color="black" style={styles.iconStyle} />
                                        <Text style={styles.buttonTextBack}> Atrás</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => {
                                        handleModify();
                                    }}
                                >
                                    <View style={styles.buttonContent}>
                                        <Ionicons name="save-outline" size={20} color="white" style={styles.iconStyle} />
                                        <Text style={styles.buttonText}>Guardar cambios</Text>
                                    </View>
                                </TouchableOpacity>
                                {estado === 'Activo'
                                    ? <TouchableOpacity
                                        style={styles.buttonDelete}
                                        onPress={() => {
                                            handleChangeAccess();
                                        }}
                                    >
                                        <View style={styles.buttonContent}>
                                            <Ionicons name="close-circle" size={20} color="white" style={styles.iconStyle} />
                                            <Text style={styles.buttonText}>Desactivar</Text>
                                        </View>
                                    </TouchableOpacity>
                                    :
                                    <TouchableOpacity
                                        style={styles.button}
                                        onPress={() => {
                                            handleChangeAccess();
                                        }}
                                    >
                                        <View style={styles.buttonContent}>
                                            <Ionicons name="checkmark" size={20} color="white" style={styles.iconStyle} />
                                            <Text style={styles.buttonText}>Activar</Text>
                                        </View>
                                    </TouchableOpacity>
                                }
                            </>
                            )}

                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView >
            <BottomNavBar />
        </View >
    );
}