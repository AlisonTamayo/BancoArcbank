package com.arcbank.sucursales.model;

import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBAttribute;
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBHashKey;
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBTable;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;

import java.time.LocalDate;
import java.util.Objects;

@DynamoDBTable(tableName = "switch-sucursales")
@Getter
@Setter
public class Sucursal {

    @Id
    @DynamoDBHashKey
    private String idSucursal;

    @DynamoDBAttribute
    private String codigoUnico;
    @DynamoDBAttribute
    private String nombre;
    @DynamoDBAttribute
    private String direccion;
    @DynamoDBAttribute
    private String telefono;

    @DynamoDBAttribute
    private Double latitud;
    @DynamoDBAttribute
    private Double longitud;

    @DynamoDBAttribute
    private String estado;

    // spring-data-dynamodb usually handles LocalDate with a converter,
    // but for simplicity we assume it works or we might need a converter.
    // boostchicken supports Java 8 types.
    @DynamoDBAttribute
    private LocalDate fechaApertura;

    @DynamoDBAttribute
    private EntidadBancaria entidadBancaria;

    @DynamoDBAttribute
    private Ubicacion ubicacion;

    public Sucursal() {
    }

    public Sucursal(String idSucursal) {
        this.idSucursal = idSucursal;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        Sucursal sucursal = (Sucursal) o;
        return Objects.equals(idSucursal, sucursal.idSucursal);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idSucursal);
    }

    @Override
    public String toString() {
        return "Sucursal{" +
                "idSucursal='" + idSucursal + '\'' +
                ", codigoUnico='" + codigoUnico + '\'' +
                ", nombre='" + nombre + '\'' +
                ", direccion='" + direccion + '\'' +
                ", telefono='" + telefono + '\'' +
                ", latitud=" + latitud +
                ", longitud=" + longitud +
                ", estado='" + estado + '\'' +
                ", fechaApertura=" + fechaApertura +
                ", entidadBancaria=" + entidadBancaria +
                ", ubicacion=" + ubicacion +
                '}';
    }
}
