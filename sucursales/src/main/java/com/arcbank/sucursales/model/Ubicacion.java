package com.arcbank.sucursales.model;

import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBAttribute;
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBDocument;
import lombok.Getter;
import lombok.Setter;

@DynamoDBDocument
@Getter
@Setter
public class Ubicacion {

    @DynamoDBAttribute
    private NivelUbicacion provincia;
    @DynamoDBAttribute
    private NivelUbicacion canton;
    @DynamoDBAttribute
    private NivelUbicacion parroquia;

    private FeriadosPorNivel feriados;

    public Ubicacion() {
    }

    @Override
    public String toString() {
        return "Ubicacion{" +
                "provincia=" + provincia +
                ", canton=" + canton +
                ", parroquia=" + parroquia +
                ", feriados=" + feriados +
                '}';
    }
}
